import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { DivisionListQuery } from '../schemas/division.schema.js';

export class DivisionRepository {
  findMany(query: DivisionListQuery) {
    return prisma.division.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: number) {
    return prisma.division.findUnique({ where: { id } });
  }

  create(data: Prisma.DivisionUncheckedCreateInput) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.division.aggregate({
        _max: { sortOrder: true },
      });

      return transaction.division.create({
        data: { ...data, sortOrder: (current._max.sortOrder ?? 0) + 1 },
      });
    });
  }

  update(id: number, data: Prisma.DivisionUncheckedUpdateInput) {
    return prisma.division.update({ where: { id }, data });
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
