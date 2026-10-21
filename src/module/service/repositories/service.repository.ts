import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { ServiceWithRelations } from '../presenters/service.presenter.js';

const serviceInclude = {
  contents: {
    orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
  },
  division: {
    include: {
      contents: {
        orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
      },
    },
  },
  mediaLinks: {
    orderBy: [{ sortOrder: 'asc' }, { mediaId: 'asc' }],
    include: { media: true },
  },
} satisfies Prisma.ServiceInclude;

type ServiceContentWrite = {
  languageId: string;
  name?: string;
  description?: string | null;
};

export type ReorderServicesResult =
  | { status: 'division-not-found' }
  | { status: 'invalid-service-ids' }
  | { status: 'ok'; services: ServiceWithRelations[] };

export class ServiceRepository {
  // Public view hides services under DRAFT divisions.
  findMany(includeDrafts: boolean) {
    return prisma.service.findMany({
      where: includeDrafts ? {} : { division: { status: 'PUBLISHED' } },
      orderBy: [{ divisionId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: serviceInclude,
    });
  }

  findById(id: number, includeDrafts = true) {
    return prisma.service.findUnique({
      where: includeDrafts ? { id } : { id, division: { status: 'PUBLISHED' } },
      include: serviceInclude,
    });
  }

  create(
    data: Prisma.ServiceUncheckedCreateInput,
    content: Required<Pick<ServiceContentWrite, 'languageId' | 'name'>> &
      Pick<ServiceContentWrite, 'description'>,
    mediaIds: number[],
  ) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.service.aggregate({
        where: { divisionId: data.divisionId },
        _max: { sortOrder: true },
      });

      const service = await transaction.service.create({
        data: {
          ...data,
          sortOrder: (current._max.sortOrder ?? 0) + 1,
        },
        select: { id: true },
      });

      await transaction.serviceContent.create({
        data: {
          serviceId: service.id,
          languageId: content.languageId,
          name: content.name,
          description: content.description ?? null,
        },
      });

      await replaceServiceMedia(transaction, service.id, mediaIds);

      return transaction.service.findUniqueOrThrow({
        where: { id: service.id },
        include: serviceInclude,
      });
    });
  }

  update(
    id: number,
    data: Prisma.ServiceUncheckedUpdateInput,
    content: ServiceContentWrite | undefined,
    targetDivisionId?: number,
    mediaIds?: number[],
  ) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.service.findUnique({
        where: { id },
        select: { divisionId: true },
      });

      let updateData = data;
      let previousDivisionId: number | undefined;
      const existingContent = content
        ? await transaction.serviceContent.findUnique({
            where: {
              serviceId_languageId: {
                serviceId: id,
                languageId: content.languageId,
              },
            },
          })
        : null;

      if (content && !existingContent && content.name === undefined) {
        return null;
      }

      if (
        current &&
        targetDivisionId !== undefined &&
        targetDivisionId !== current.divisionId
      ) {
        const target = await transaction.service.aggregate({
          where: { divisionId: targetDivisionId },
          _max: { sortOrder: true },
        });

        updateData = {
          ...data,
          divisionId: targetDivisionId,
          sortOrder: (target._max.sortOrder ?? 0) + 1,
        };
        previousDivisionId = current.divisionId;
      }

      await transaction.service.update({
        where: { id },
        data: updateData,
      });

      if (content) {
        const where = {
          serviceId_languageId: {
            serviceId: id,
            languageId: content.languageId,
          },
        };

        if (existingContent) {
          await transaction.serviceContent.update({
            where,
            data: {
              ...(content.name !== undefined ? { name: content.name } : {}),
              ...(content.description !== undefined
                ? { description: content.description }
                : {}),
            },
          });
        } else {
          await transaction.serviceContent.create({
            data: {
              serviceId: id,
              languageId: content.languageId,
              name: content.name!,
              description: content.description ?? null,
            },
          });
        }
      }

      if (mediaIds !== undefined) {
        await replaceServiceMedia(transaction, id, mediaIds);
      }

      if (previousDivisionId !== undefined) {
        await compactServices(transaction, previousDivisionId);
      }

      return transaction.service.findUniqueOrThrow({
        where: { id },
        include: serviceInclude,
      });
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
          include: serviceInclude,
        }),
      } satisfies ReorderServicesResult;
    });
  }
}

async function replaceServiceMedia(
  transaction: Prisma.TransactionClient,
  serviceId: number,
  mediaIds: number[],
): Promise<void> {
  await transaction.serviceMedia.deleteMany({ where: { serviceId } });

  if (mediaIds.length === 0) return;

  await transaction.serviceMedia.createMany({
    data: mediaIds.map((mediaId, index) => ({
      serviceId,
      mediaId,
      sortOrder: index + 1,
    })),
  });
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
