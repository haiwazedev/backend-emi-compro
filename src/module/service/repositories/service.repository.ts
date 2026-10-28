import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { ServiceWithRelations } from '../presenters/service.presenter.js';
import type { ServiceMediaInput } from '../schemas/service.schema.js';

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
    include: {
      media: true,
      contents: {
        orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
      },
    },
  },
} satisfies Prisma.ServiceInclude;

type ServiceContentWrite = {
  languageId: string;
  name: string;
};

type ServiceMediaWrite = {
  languageId: string;
  items: ServiceMediaInput[];
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
    content: ServiceContentWrite,
    media: ServiceMediaInput[],
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
        },
      });

      await replaceServiceMedia(
        transaction,
        service.id,
        content.languageId,
        media,
      );

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
    media?: ServiceMediaWrite,
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
            data: { name: content.name },
          });
        } else {
          await transaction.serviceContent.create({
            data: {
              serviceId: id,
              languageId: content.languageId,
              name: content.name,
            },
          });
        }
      }

      if (media !== undefined) {
        await replaceServiceMedia(
          transaction,
          id,
          media.languageId,
          media.items,
        );
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

export async function replaceServiceMedia(
  transaction: Prisma.TransactionClient,
  serviceId: number,
  languageId: string,
  mediaItems: ServiceMediaInput[],
): Promise<void> {
  const existingLinks = await transaction.serviceMedia.findMany({
    where: { serviceId },
    select: { mediaId: true, sortOrder: true },
  });

  const lowestSortOrder = Math.min(
    0,
    ...existingLinks.map(({ sortOrder }) => sortOrder),
  );

  for (const [index, link] of existingLinks.entries()) {
    await transaction.serviceMedia.update({
      where: {
        serviceId_mediaId: { serviceId, mediaId: link.mediaId },
      },
      data: { sortOrder: lowestSortOrder - index - 1 },
    });
  }

  const mediaIds = mediaItems.map(({ media_id }) => media_id);

  await transaction.serviceMedia.deleteMany({
    where: {
      serviceId,
      ...(mediaIds.length > 0 ? { mediaId: { notIn: mediaIds } } : {}),
    },
  });

  for (const [index, item] of mediaItems.entries()) {
    const mediaId = item.media_id;
    const where = {
      serviceId_mediaId: { serviceId, mediaId },
    };

    await transaction.serviceMedia.upsert({
      where,
      create: { serviceId, mediaId, sortOrder: index + 1 },
      update: { sortOrder: index + 1 },
    });

    await transaction.serviceMediaContent.upsert({
      where: {
        serviceId_mediaId_languageId: { serviceId, mediaId, languageId },
      },
      create: {
        serviceId,
        mediaId,
        languageId,
        description: item.description ?? null,
      },
      update:
        item.description === undefined ? {} : { description: item.description },
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
