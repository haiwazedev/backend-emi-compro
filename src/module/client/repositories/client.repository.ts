import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';

const orderBy = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export class ClientRepository {
  findMany() {
    return prisma.client.findMany({ orderBy: [...orderBy] });
  }

  findById(id: number) {
    return prisma.client.findUnique({ where: { id } });
  }

  create(data: Prisma.ClientUncheckedCreateInput) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.client.aggregate({
        _max: { sortOrder: true },
      });

      return transaction.client.create({
        data: { ...data, sortOrder: (current._max.sortOrder ?? 0) + 1 },
      });
    });
  }

  update(id: number, data: Prisma.ClientUncheckedUpdateInput) {
    return prisma.client.update({ where: { id }, data });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      await transaction.client.delete({ where: { id } });
      await compactClients(transaction);
    });
  }

  reorder(clientIds: number[]) {
    return prisma.$transaction(async (transaction) => {
      const clients = await transaction.client.findMany({
        select: { id: true },
      });

      if (
        !containsEveryIdOnce(
          clientIds,
          clients.map(({ id }) => id),
        )
      ) {
        return null;
      }

      for (const [index, id] of clientIds.entries()) {
        await transaction.client.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      }

      return transaction.client.findMany({ orderBy: [...orderBy] });
    });
  }
}

async function compactClients(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const clients = await transaction.client.findMany({
    orderBy: [...orderBy],
    select: { id: true, sortOrder: true },
  });

  for (const [index, client] of clients.entries()) {
    const sortOrder = index + 1;

    if (client.sortOrder !== sortOrder) {
      await transaction.client.update({
        where: { id: client.id },
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
