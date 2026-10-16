import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';

export const SITE_SETTING_ID = 1;

const socialMediaOrderBy = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export type SocialMediaWrite =
  | { id: number; data: Prisma.SiteSocialMediaUncheckedUpdateInput }
  | { id?: undefined; data: Prisma.SiteSocialMediaUncheckedCreateInput };

export class SiteSettingRepository {
  findSetting() {
    return prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
  }

  findSocialMedias(includeDrafts: boolean) {
    return prisma.siteSocialMedia.findMany({
      where: includeDrafts ? undefined : { status: 'PUBLISHED' },
      orderBy: [...socialMediaOrderBy],
    });
  }

  save(
    create: Prisma.SiteSettingUncheckedCreateInput,
    update: Prisma.SiteSettingUncheckedUpdateInput,
    keptIds: number[],
    socialMedias: SocialMediaWrite[],
  ) {
    return prisma.$transaction(async (transaction) => {
      await transaction.siteSetting.upsert({
        where: { id: SITE_SETTING_ID },
        create: { ...create, id: SITE_SETTING_ID },
        update,
      });

      await transaction.siteSocialMedia.deleteMany({
        where: { id: { notIn: keptIds } },
      });

      for (const socialMedia of socialMedias) {
        if (socialMedia.id === undefined) {
          await transaction.siteSocialMedia.create({ data: socialMedia.data });
        } else {
          await transaction.siteSocialMedia.update({
            where: { id: socialMedia.id },
            data: socialMedia.data,
          });
        }
      }
    });
  }
}
