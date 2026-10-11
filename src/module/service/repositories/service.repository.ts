import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { ServiceWithDivision } from '../presenters/service.presenter.js';

export type ReorderServicesResult =
  | { status: 'division-not-found' }
  | { status: 'invalid-service-ids' }
  | { status: 'ok'; services: ServiceWithDivision[] };

export class ServiceRepository {
  findMany() {
    return prisma.service.findMany({
      orderBy: [{ divisionId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: { division: true },
    });
  }

  findById(id: number) {
    return prisma.service.findUnique({
      where: { id },
      include: { division: true },
    });
  }

  create(data: Prisma.ServiceUncheckedCreateInput) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.service.aggregate({
        where: { divisionId: data.divisionId },
        _max: { sortOrder: true },
      });

      return transaction.service.create({
        data: {
          ...data,
          sortOrder: (current._max.sortOrder ?? 0) + 1,
        },
        include: { division: true },
      });
    });
  }

  update(
    id: number,
    data: Prisma.ServiceUncheckedUpdateInput,
    targetDivisionId?: number,
  ) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.service.findUnique({
        where: { id },
        select: { divisionId: true },
      });

      if (!current || targetDivisionId === undefined) {
        return transaction.service.update({
          where: { id },
          data,
          include: { division: true },
        });
      }

      if (targetDivisionId === current.divisionId) {
        return transaction.service.update({
          where: { id },
          data,
          include: { division: true },
        });
      }

      const target = await transaction.service.aggregate({
        where: { divisionId: targetDivisionId },
        _max: { sortOrder: true },
      });
      const updated = await transaction.service.update({
        where: { id },
        data: {
          ...data,
          divisionId: targetDivisionId,
          sortOrder: (target._max.sortOrder ?? 0) + 1,
        },
        include: { division: true },
      });

      await compactServices(transaction, current.divisionId);

      return updated;
    });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      const deleted = await transaction.service.delete({
        where: { id },
        select: { divisionId: true },
      });

      await compactServices(transaction, deleted.divisionId);
    });
  }

  reorderByDivision(divisionId: number, serviceIds: number[]) {
    return prisma.$transaction(async (transaction) => {
      const division = await transaction.division.findUnique({
        where: { id: divisionId },
        select: { id: true },
      });

      if (!division) {
        return { status: 'division-not-found' } satisfies ReorderServicesResult;
      }

      const services = await transaction.service.findMany({
        where: { divisionId },
        select: { id: true },
      });

      if (
        !containsEveryIdOnce(
          serviceIds,
          services.map(({ id }) => id),
        )
      ) {
        return {
          status: 'invalid-service-ids',
        } satisfies ReorderServicesResult;
      }

      for (const [index, id] of serviceIds.entries()) {
        await transaction.service.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      }

      return {
        status: 'ok',
        services: await transaction.service.findMany({
          where: { divisionId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { division: true },
        }),
      } satisfies ReorderServicesResult;
    });
  }
}

async function compactServices(
  transaction: Prisma.TransactionClient,
  divisionId: number,
): Promise<void> {
  const services = await transaction.service.findMany({
    where: { divisionId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, sortOrder: true },
  });

  for (const [index, service] of services.entries()) {
    const sortOrder = index + 1;

    if (service.sortOrder !== sortOrder) {
      await transaction.service.update({
        where: { id: service.id },
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
