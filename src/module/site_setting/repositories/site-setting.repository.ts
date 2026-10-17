import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';

const socialMediaOrderBy = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export type SocialMediaWrite =
  | { id: number; data: Prisma.SiteSocialMediaUncheckedUpdateInput }
  | { id?: undefined; data: Prisma.SiteSocialMediaUncheckedCreateInput };

export type SettingValues = Record<string, string | null>;

export class SiteSettingRepository {
  findSettings(languageId: string) {
    return prisma.siteSetting.findMany({
      where: { languageId },
      orderBy: { id: 'asc' },
    });
  }

  findSocialMedias(includeDrafts: boolean) {
    return prisma.siteSocialMedia.findMany({
      where: includeDrafts ? undefined : { status: 'PUBLISHED' },
      orderBy: [...socialMediaOrderBy],
    });
  }

  save(
    languageId: string,
    values: SettingValues,
    audit: { updatedAt: Date; updatedBy: string },
    keptIds: number[],
    socialMedias: SocialMediaWrite[],
  ) {
    return prisma.$transaction(async (transaction) => {
      for (const [key, value] of Object.entries(values)) {
        await transaction.siteSetting.update({
          where: { key_languageId: { key, languageId } },
          data: { value, ...audit },
        });
      }

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
