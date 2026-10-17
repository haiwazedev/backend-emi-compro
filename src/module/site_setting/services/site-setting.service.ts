import { ApiError } from '../../../shared/errors/api-error.js';
import {
  SiteSettingRepository,
  type SocialMediaWrite,
} from '../repositories/site-setting.repository.js';
import type { SaveSiteSettingInput } from '../schemas/site-setting.schema.js';
import {
  ICON_FILE_RULE,
  LOGO_FILE_RULE,
  SiteSettingFileService,
  type StoredFile,
} from './site-setting-file.service.js';

export type SiteSettingFiles = {
  danantara_logo?: Express.Multer.File[];
  pln_logo?: Express.Multer.File[];
  social_icons?: Express.Multer.File[];
};

type StoredFiles = {
  danantaraLogo?: StoredFile;
  plnLogo?: StoredFile;
  icons: StoredFile[];
};

export class SiteSettingService {
  constructor(
    private readonly repository = new SiteSettingRepository(),
    private readonly fileService = new SiteSettingFileService(),
  ) {}

  async get(includeDrafts: boolean) {
    const setting = await this.repository.findSetting();
    if (!setting) return null;

    const socialMedias = await this.repository.findSocialMedias(includeDrafts);
    return { setting, socialMedias };
  }

  async save(
    input: SaveSiteSettingInput,
    files: SiteSettingFiles,
    userName: string,
  ) {
    const auditName = getAuditName(userName);
    const iconFiles = files.social_icons ?? [];
    validateIconIndexes(input, iconFiles.length);

    const currentSetting = await this.repository.findSetting();
    const currentSocialMedias = await this.repository.findSocialMedias(true);
    const currentById = new Map(
      currentSocialMedias.map((socialMedia) => [socialMedia.id, socialMedia]),
    );
    const keptIds = input.social_medias.flatMap((socialMedia) =>
      socialMedia.id === undefined ? [] : [socialMedia.id],
    );

    if (new Set(keptIds).size !== keptIds.length) {
      throw new ApiError(400, 'Social media IDs must be unique.');
    }
    if (keptIds.some((id) => !currentById.has(id))) {
      throw new ApiError(404, 'Social media was not found.');
    }

    const stored = await this.storeFiles(files, iconFiles);
    const now = new Date();
    const settingFields = {
      companyName: input.company_name,
      companyShortName: input.company_short_name,
      companyAddress: input.company_address,
      companyPhoneNumber: input.company_phone_number,
      companyWhatsappNumber: input.company_whatsapp_number,
      mainEmail: input.main_email,
      marketingEmail: input.marketing_email,
      operationalDay: input.operational_day,
      operationalStartTime: input.operational_start_time,
      operationalEndTime: input.operational_end_time,
      ...toFileFields('danantaraLogo', stored.danantaraLogo),
      ...toFileFields('plnLogo', stored.plnLogo),
    };

    const socialMediaWrites = input.social_medias.map<SocialMediaWrite>(
      (socialMedia, index) => {
        const icon =
          socialMedia.icon_index === undefined
            ? undefined
            : stored.icons[socialMedia.icon_index];
        const fields = {
          platformName: socialMedia.platform_name,
          platformUrlOrAccountName: socialMedia.platform_url_or_account_name,
          status: socialMedia.status,
          sortOrder: index + 1,
          ...toFileFields('icon', icon),
        };

        return socialMedia.id === undefined
          ? { data: { ...fields, createdBy: auditName } }
          : {
              id: socialMedia.id,
              data: { ...fields, updatedAt: now, updatedBy: auditName },
            };
      },
    );

    try {
      await this.repository.save(
        { ...settingFields, createdBy: auditName },
        { ...settingFields, updatedAt: now, updatedBy: auditName },
        keptIds,
        socialMediaWrites,
      );
    } catch (error) {
      await this.removeStoredFiles(stored);
      throw error;
    }

    await this.removeReplacedFiles(input, stored, currentSetting, [
      ...currentById.values(),
    ]);

    return this.get(true);
  }

  private async storeFiles(
    files: SiteSettingFiles,
    iconFiles: Express.Multer.File[],
  ): Promise<StoredFiles> {
    const stored: StoredFiles = { icons: [] };

    try {
      const danantaraLogo = files.danantara_logo?.[0];
      const plnLogo = files.pln_logo?.[0];
      if (danantaraLogo) {
        stored.danantaraLogo = await this.fileService.store(
          LOGO_FILE_RULE,
          danantaraLogo,
        );
      }
      if (plnLogo) {
        stored.plnLogo = await this.fileService.store(LOGO_FILE_RULE, plnLogo);
      }
      for (const iconFile of iconFiles) {
        stored.icons.push(
          await this.fileService.store(ICON_FILE_RULE, iconFile),
        );
      }
    } catch (error) {
      await this.removeStoredFiles(stored);
      throw error;
    }

    return stored;
  }

  private async removeStoredFiles(stored: StoredFiles) {
    await this.fileService.remove(
      LOGO_FILE_RULE,
      stored.danantaraLogo?.filepath ?? null,
    );
    await this.fileService.remove(
      LOGO_FILE_RULE,
      stored.plnLogo?.filepath ?? null,
    );
    for (const icon of stored.icons) {
      await this.fileService.remove(ICON_FILE_RULE, icon.filepath);
    }
  }

  private async removeReplacedFiles(
    input: SaveSiteSettingInput,
    stored: StoredFiles,
    currentSetting: Awaited<ReturnType<SiteSettingRepository['findSetting']>>,
    currentSocialMedias: Awaited<
      ReturnType<SiteSettingRepository['findSocialMedias']>
    >,
  ) {
    if (stored.danantaraLogo) {
      await this.fileService.remove(
        LOGO_FILE_RULE,
        currentSetting?.danantaraLogoFilepath ?? null,
      );
    }
    if (stored.plnLogo) {
      await this.fileService.remove(
        LOGO_FILE_RULE,
        currentSetting?.plnLogoFilepath ?? null,
      );
    }

    const inputById = new Map(
      input.social_medias.map((socialMedia) => [socialMedia.id, socialMedia]),
    );
    for (const current of currentSocialMedias) {
      const next = inputById.get(current.id);
      const isDeleted = !next;
      const isIconReplaced = next?.icon_index !== undefined;

      if (isDeleted || isIconReplaced) {
        await this.fileService.remove(ICON_FILE_RULE, current.iconFilepath);
      }
    }
  }
}

function validateIconIndexes(input: SaveSiteSettingInput, iconCount: number) {
  const indexes = input.social_medias.flatMap((socialMedia) =>
    socialMedia.icon_index === undefined ? [] : [socialMedia.icon_index],
  );
  const usesEveryIconOnce =
    indexes.length === iconCount &&
    new Set(indexes).size === iconCount &&
    indexes.every((index) => index < iconCount);

  if (!usesEveryIconOnce) {
    throw new ApiError(
      400,
      'Each uploaded social icon must be referenced by exactly one icon_index.',
    );
  }
}

function toFileFields<Prefix extends string>(
  prefix: Prefix,
  file: StoredFile | undefined,
) {
  if (!file) return {};

  return {
    [`${prefix}Filename`]: file.filename,
    [`${prefix}Filepath`]: file.filepath,
    [`${prefix}Extension`]: file.extension,
    [`${prefix}Size`]: file.size,
    [`${prefix}Metadata`]: file.metadata,
  };
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}
