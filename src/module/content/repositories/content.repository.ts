import { Prisma, type Content } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type {
  ContentListQuery,
  UpsertContentInput,
} from '../schemas/content.schema.js';

type SortableCombination = {
  page: string;
  blockKey: string;
  blockType: string;
};

export class ContentRepository {
  findMany(query: ContentListQuery) {
    return prisma.content.findMany({
      where: {
        ...(query.page ? { page: query.page } : {}),
        ...(query.block_key ? { blockKey: query.block_key } : {}),
        ...(query.block_type ? { blockType: query.block_type } : {}),
      },
      orderBy: [
        { page: 'asc' },
        { blockKey: 'asc' },
        { blockType: 'asc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  replaceMany(
    inputs: UpsertContentInput[],
    sortableCombinations: SortableCombination[],
    userName: string,
  ): Promise<Content[]> {
    return prisma.$transaction(async (transaction) => {
      for (const combination of sortableCombinations) {
        await transaction.content.deleteMany({
          where: {
            page: combination.page,
            blockKey: combination.blockKey,
            blockType: combination.blockType,
          },
        });
      }

      const sortableIdentities = new Set(
        sortableCombinations.map((combination) =>
          JSON.stringify([
            combination.page,
            combination.blockKey,
            combination.blockType,
          ]),
        ),
      );
      const contents: Content[] = [];

      for (const input of inputs) {
        const sortOrder = input.sort_order ?? 1;
        const identity = JSON.stringify([
          input.page,
          input.block_key,
          input.block_type,
        ]);
        const create = toCreateData(input, sortOrder, userName);

        if (sortableIdentities.has(identity)) {
          contents.push(await transaction.content.create({ data: create }));
          continue;
        }

        contents.push(
          await transaction.content.upsert({
            where: {
              page_blockKey_blockType_sortOrder: {
                page: input.page,
                blockKey: input.block_key,
                blockType: input.block_type,
                sortOrder,
              },
            },
            create,
            update: {
              ...(input.data !== undefined
                ? { data: toJsonValue(input.data) }
                : {}),
              ...(input.media_id !== undefined
                ? { mediaId: input.media_id }
                : {}),
              updatedAt: new Date(),
              updatedBy: userName,
            },
          }),
        );
      }

      return contents;
    });
  }
}

function toCreateData(
  input: UpsertContentInput,
  sortOrder: number,
  userName: string,
): Prisma.ContentUncheckedCreateInput {
  return {
    page: input.page,
    blockKey: input.block_key,
    blockType: input.block_type,
    sortOrder,
    ...(input.data !== undefined ? { data: toJsonValue(input.data) } : {}),
    mediaId: input.media_id ?? null,
    createdBy: userName,
    updatedBy: userName,
  };
}

function toJsonValue(data: unknown) {
  return data === null ? Prisma.DbNull : (data as Prisma.InputJsonValue);
}
