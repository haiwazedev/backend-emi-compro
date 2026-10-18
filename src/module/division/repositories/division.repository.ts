import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { DivisionListQuery } from '../schemas/division.schema.js';

const divisionInclude = {
  contents: {
    orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
  },
} satisfies Prisma.DivisionInclude;

type DivisionContentWrite = {
  languageId: string;
  name?: string;
  abbr?: string;
  description?: string | null;
};

export class DivisionRepository {
  findMany(query: DivisionListQuery) {
    return prisma.division.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: divisionInclude,
    });
  }

  findById(id: number) {
    return prisma.division.findUnique({
      where: { id },
      include: divisionInclude,
    });
  }

  create(
    data: Prisma.DivisionUncheckedCreateInput,
    content: Required<
      Pick<DivisionContentWrite, 'languageId' | 'name' | 'abbr'>
    > &
      Pick<DivisionContentWrite, 'description'>,
  ) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.division.aggregate({
        _max: { sortOrder: true },
      });

      const division = await transaction.division.create({
        data: { ...data, sortOrder: (current._max.sortOrder ?? 0) + 1 },
        select: { id: true },
      });

      await transaction.divisionContent.create({
        data: {
          divisionId: division.id,
          languageId: content.languageId,
          name: content.name,
          abbr: content.abbr,
          description: content.description ?? null,
        },
      });

      return transaction.division.findUniqueOrThrow({
        where: { id: division.id },
        include: divisionInclude,
      });
    });
  }

  update(
    id: number,
    data: Prisma.DivisionUncheckedUpdateInput,
    content?: DivisionContentWrite,
  ) {
    return prisma.$transaction(async (transaction) => {
      const existingContent = content
        ? await transaction.divisionContent.findUnique({
            where: {
              divisionId_languageId: {
                divisionId: id,
                languageId: content.languageId,
              },
            },
          })
        : null;

      if (
        content &&
        !existingContent &&
        (content.name === undefined || content.abbr === undefined)
      ) {
        return null;
      }

      await transaction.division.update({ where: { id }, data });

      if (content) {
        const where = {
          divisionId_languageId: {
            divisionId: id,
            languageId: content.languageId,
          },
        };

        if (existingContent) {
          await transaction.divisionContent.update({
            where,
            data: {
              ...(content.name !== undefined ? { name: content.name } : {}),
              ...(content.abbr !== undefined ? { abbr: content.abbr } : {}),
              ...(content.description !== undefined
                ? { description: content.description }
                : {}),
            },
          });
        } else {
          await transaction.divisionContent.create({
            data: {
              divisionId: id,
              languageId: content.languageId,
              name: content.name!,
              abbr: content.abbr!,
              description: content.description ?? null,
            },
          });
        }
      }

      return transaction.division.findUniqueOrThrow({
        where: { id },
        include: divisionInclude,
      });
    });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      await transaction.division.delete({ where: { id } });
      await compactDivisions(transaction);
    });
  }

  reorder(divisionIds: number[]) {
    return prisma.$transaction(async (transaction) => {
      const divisions = await transaction.division.findMany({
        select: { id: true },
      });

      if (
        !containsEveryIdOnce(
          divisionIds,
          divisions.map(({ id }) => id),
        )
      ) {
        return null;
      }

      for (const [index, id] of divisionIds.entries()) {
        await transaction.division.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      }

      return transaction.division.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: divisionInclude,
      });
    });
  }
}

async function compactDivisions(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const divisions = await transaction.division.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, sortOrder: true },
  });

  for (const [index, division] of divisions.entries()) {
    const sortOrder = index + 1;

    if (division.sortOrder !== sortOrder) {
      await transaction.division.update({
        where: { id: division.id },
        data: { sortOrder },
      });
    }
  }
}

function containsEveryIdOnce(requestedIds: number[], existingIds: number[]) {
  if (requestedIds.length !== existingIds.length) {
    return false;
  }

  const requestedIdSet = new Set(requestedIds);

  return (
    requestedIdSet.size === requestedIds.length &&
    existingIds.every((id) => requestedIdSet.has(id))
  );
}
