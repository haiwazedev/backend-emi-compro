import type {
  SiteSetting,
  SiteSocialMedia,
} from '../../../generated/prisma/client.js';

export function presentSiteSetting(
  result: { setting: SiteSetting; socialMedias: SiteSocialMedia[] } | null,
) {
  if (!result) return null;

  const { setting, socialMedias } = result;

  return {
    id: setting.id,
    company_name: setting.companyName,
    company_short_name: setting.companyShortName,
    danantara_logo_filename: setting.danantaraLogoFilename,
    danantara_logo_filepath: setting.danantaraLogoFilepath,
    danantara_logo_extension: setting.danantaraLogoExtension,
    danantara_logo_size: setting.danantaraLogoSize,
    danantara_logo_metadata: setting.danantaraLogoMetadata,
    pln_logo_filename: setting.plnLogoFilename,
    pln_logo_filepath: setting.plnLogoFilepath,
    pln_logo_extension: setting.plnLogoExtension,
    pln_logo_size: setting.plnLogoSize,
    pln_logo_metadata: setting.plnLogoMetadata,
    company_address: setting.companyAddress,
    company_phone_number: setting.companyPhoneNumber,
    company_whatsapp_number: setting.companyWhatsappNumber,
    main_email: setting.mainEmail,
    marketing_email: setting.marketingEmail,
    operational_day: setting.operationalDay,
    operational_start_time: setting.operationalStartTime,
    operational_end_time: setting.operationalEndTime,
    social_medias: socialMedias.map(presentSocialMedia),
    created_at: setting.createdAt.toISOString(),
    created_by: setting.createdBy,
    updated_at: setting.updatedAt?.toISOString() ?? null,
    updated_by: setting.updatedBy,
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
