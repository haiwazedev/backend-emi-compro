import type {
  SiteSetting,
  SiteSocialMedia,
} from '../../../generated/prisma/client.js';

export function presentSiteSetting({
  languageId,
  settings,
  socialMedias,
}: {
  languageId: string;
  settings: SiteSetting[];
  socialMedias: SiteSocialMedia[];
}) {
  const values = new Map(settings.map((setting) => [setting.key, setting]));
  // A configured key is a string ('' when empty); null means no row for this language.
  const valueOf = (key: string) => {
    const setting = values.get(key);
    return setting ? (setting.value ?? '') : null;
  };
  const created = settings.reduce<SiteSetting | undefined>(
    (earliest, setting) =>
      !earliest || setting.createdAt < earliest.createdAt ? setting : earliest,
    undefined,
  );
  const updated = settings.reduce<SiteSetting | undefined>(
    (latest, setting) =>
      setting.updatedAt &&
      (!latest?.updatedAt || setting.updatedAt > latest.updatedAt)
        ? setting
        : latest,
    undefined,
  );

  return {
    language_id: languageId,
    company_name: valueOf('company_name'),
    company_short_name: valueOf('company_short_name'),
    danantara_logo_filepath: valueOf('danantara_logo'),
    pln_logo_filepath: valueOf('pln_logo'),
    company_address: valueOf('company_address'),
    company_phone_number: valueOf('company_phone_number'),
    company_whatsapp_number: valueOf('company_whatsapp_number'),
    main_email: valueOf('main_email'),
    marketing_email: valueOf('marketing_email'),
    operational_day: valueOf('operational_day'),
    operational_start_time: valueOf('operational_start_time'),
    operational_end_time: valueOf('operational_end_time'),
    social_medias: socialMedias.map(presentSocialMedia),
    created_at: created?.createdAt.toISOString() ?? null,
    created_by: created?.createdBy ?? null,
    updated_at: updated?.updatedAt?.toISOString() ?? null,
    updated_by: updated?.updatedBy ?? null,
  };
}

function presentSocialMedia(socialMedia: SiteSocialMedia) {
  return {
    id: socialMedia.id,
    platform_name: socialMedia.platformName,
    platform_url_or_account_name: socialMedia.platformUrlOrAccountName,
    icon_filename: socialMedia.iconFilename,
    icon_filepath: socialMedia.iconFilepath,
    icon_extension: socialMedia.iconExtension,
    icon_size: socialMedia.iconSize,
    icon_metadata: socialMedia.iconMetadata,
    status: socialMedia.status,
    sort_order: socialMedia.sortOrder,
    created_at: socialMedia.createdAt.toISOString(),
    created_by: socialMedia.createdBy,
    updated_at: socialMedia.updatedAt?.toISOString() ?? null,
    updated_by: socialMedia.updatedBy,
  };
}
