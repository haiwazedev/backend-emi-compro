import type { SiteSetting } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { LanguageService } from '../../language/services/language.service.js';
import {
  SiteSettingRepository,
  type SettingValues,
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

const DEFAULT_LANGUAGE = 'id';

export class SiteSettingService {
  constructor(
    private readonly repository = new SiteSettingRepository(),
    private readonly fileService = new SiteSettingFileService(),
    private readonly languageService = new LanguageService(),
  ) {}

  async get(languageId: string | undefined, includeDrafts: boolean) {
    const language = await this.languageService.requireActive(
      languageId ?? DEFAULT_LANGUAGE,
    );
    const settings = await this.repository.findSettings(language.id);
    const socialMedias = await this.repository.findSocialMedias(includeDrafts);

    return { languageId: language.id, settings, socialMedias };
  }

  async save(
    input: SaveSiteSettingInput,
    files: SiteSettingFiles,
    userName: string,
  ) {
    const auditName = getAuditName(userName);
    const iconFiles = files.social_icons ?? [];
    validateIconIndexes(input, iconFiles.length);

    const language = await this.languageService.requireActive(
      input.language_id,
    );
    const currentSettings = new Map(
      (await this.repository.findSettings(language.id)).map((setting) => [
        setting.key,
        setting,
      ]),
    );
    // Omitted fields are left unchanged.
    const textValues = Object.fromEntries(
      Object.entries({
        company_name: input.company_name,
        company_short_name: input.company_short_name,
        company_address: input.company_address,
        company_phone_number: input.company_phone_number,
        company_whatsapp_number: input.company_whatsapp_number,
        main_email: input.main_email,
        marketing_email: input.marketing_email,
        operational_day: input.operational_day,
        operational_start_time: input.operational_start_time,
        operational_end_time: input.operational_end_time,
      }).filter(([, value]) => value !== undefined),
    ) as SettingValues;
    validateSettingKeys(
      [
        ...Object.keys(textValues),
        ...(files.danantara_logo?.length ? ['danantara_logo'] : []),
        ...(files.pln_logo?.length ? ['pln_logo'] : []),
      ],
      currentSettings,
    );
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
    const settingValues: SettingValues = {
      ...textValues,
      // Logos are only replaced when a new file is uploaded.
      ...(stored.danantaraLogo && {
        danantara_logo: stored.danantaraLogo.filepath,
      }),
      ...(stored.plnLogo && { pln_logo: stored.plnLogo.filepath }),
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
        language.id,
        settingValues,
        { updatedAt: now, updatedBy: auditName },
        keptIds,
        socialMediaWrites,
      );
    } catch (error) {
      await this.removeStoredFiles(stored);
      throw error;
    }

    await this.removeReplacedFiles(input, stored, currentSettings, [
      ...currentById.values(),
    ]);

    return this.get(language.id, true);
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
    currentSettings: Map<string, SiteSetting>,
    currentSocialMedias: Awaited<
      ReturnType<SiteSettingRepository['findSocialMedias']>
    >,
  ) {
    if (stored.danantaraLogo) {
      await this.fileService.remove(
        LOGO_FILE_RULE,
        currentSettings.get('danantara_logo')?.value ?? null,
      );
    }
    if (stored.plnLogo) {
      await this.fileService.remove(
        LOGO_FILE_RULE,
        currentSettings.get('pln_logo')?.value ?? null,
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

// Keys are master data seeded per language in site_settings.
function validateSettingKeys(
  keys: string[],
  settings: Map<string, SiteSetting>,
) {
  const missingKey = keys.find((key) => !settings.has(key));
  if (missingKey) {
    throw new ApiError(
      400,
      `${missingKey}: Input key not configured for this language.`,
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
