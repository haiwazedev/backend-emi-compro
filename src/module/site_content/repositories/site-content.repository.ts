import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { SiteContentItemInput } from '../schemas/site-content.schema.js';

const includeSiteContent = { siteContent: true } as const;

export type SiteContentItemRecord = Prisma.SiteContentItemGetPayload<{
  include: typeof includeSiteContent;
}>;

export type SaveSiteContentItem = SiteContentItemInput & {
  isSortable: boolean;
};

export class SiteContentRepository {
  findItems(page: string, languageId: string) {
    return prisma.siteContentItem.findMany({
      where: { languageId, siteContent: { page } },
      include: includeSiteContent,
      orderBy: [
        { siteContent: { blockKey: 'asc' } },
        { siteContent: { blockType: 'asc' } },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async hasItemInLanguage(languageId: string): Promise<boolean> {
    const item = await prisma.siteContentItem.findFirst({
      where: { languageId },
      select: { id: true },
    });

    return Boolean(item);
  }

  save(
    languageId: string,
    inputs: SaveSiteContentItem[],
    userName: string,
  ): Promise<SiteContentItemRecord[]> {
    return prisma.$transaction(async (transaction) => {
      const siteContentIds = new Map<string, number>();
      const clearedIds = new Set<number>();
      const items: SiteContentItemRecord[] = [];

      for (const input of inputs) {
        const identity = JSON.stringify([
          input.page,
          input.block_key,
          input.block_type,
        ]);
        let siteContentId = siteContentIds.get(identity);

        if (siteContentId === undefined) {
          // Headers are created on first save of an allowlisted block.
          const siteContent = await transaction.siteContent.upsert({
            where: {
              page_blockKey_blockType: {
                page: input.page,
                blockKey: input.block_key,
                blockType: input.block_type,
              },
            },
            create: {
              page: input.page,
              blockKey: input.block_key,
              blockType: input.block_type,
              createdBy: userName,
            },
            update: {},
          });
          siteContentId = siteContent.id;
          siteContentIds.set(identity, siteContentId);
        }

        // Sortable blocks sent in the request replace their items for this language.
        if (input.isSortable && !clearedIds.has(siteContentId)) {
          await transaction.siteContentItem.deleteMany({
            where: { siteContentId, languageId },
          });
          clearedIds.add(siteContentId);
        }

        const sortOrder = input.sort_order ?? 1;
        const data = input.data as Prisma.InputJsonValue;

        items.push(
          input.isSortable
            ? await transaction.siteContentItem.create({
                data: {
                  siteContentId,
                  languageId,
                  sortOrder,
                  data,
                  createdBy: userName,
                  updatedBy: userName,
                },
                include: includeSiteContent,
              })
            : await transaction.siteContentItem.upsert({
                where: {
                  siteContentId_languageId_sortOrder: {
                    siteContentId,
                    languageId,
                    sortOrder,
                  },
                },
                create: {
                  siteContentId,
                  languageId,
                  sortOrder,
                  data,
                  createdBy: userName,
                  updatedBy: userName,
                },
                update: { data, updatedAt: new Date(), updatedBy: userName },
                include: includeSiteContent,
              }),
        );
      }

      return items;
    });
  }
}
