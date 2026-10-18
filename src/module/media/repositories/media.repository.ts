import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { MediaListQuery } from '../schemas/media.schema.js';

export class MediaRepository {
  findMany(query: MediaListQuery) {
    const direction = query.sort_order;

    return prisma.media.findMany({
      where: query.type ? { type: query.type } : undefined,
      orderBy: [{ createdAt: direction }, { id: direction }],
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).media.findUnique({ where: { id } });
  }

  create(
    data: Prisma.MediaUncheckedCreateInput,
    transaction?: Prisma.TransactionClient,
  ) {
    return (transaction ?? prisma).media.create({ data });
  }

  delete(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).media.delete({ where: { id } });
  }

  findManyByIds(ids: number[], transaction: Prisma.TransactionClient) {
    return transaction.media.findMany({ where: { id: { in: ids } } });
  }

  findManyByPaths(paths: string[]) {
    return prisma.media.findMany({
      where: { path: { in: paths } },
      select: { path: true },
    });
  }

  deleteMany(ids: number[], transaction: Prisma.TransactionClient) {
    return transaction.media.deleteMany({ where: { id: { in: ids } } });
  }
}
