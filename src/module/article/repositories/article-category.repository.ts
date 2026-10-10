import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';

export class ArticleCategoryRepository {
  findMany() {
    return prisma.articleCategory.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).articleCategory.findUnique({
      where: { id },
    });
  }

  findBySlug(slug: string) {
    return prisma.articleCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  create(data: Prisma.ArticleCategoryCreateInput) {
    return prisma.articleCategory.create({ data });
  }

  update(id: number, data: Prisma.ArticleCategoryUpdateInput) {
    return prisma.articleCategory.update({ where: { id }, data });
  }

  delete(id: number) {
    return prisma.articleCategory.delete({ where: { id } });
  }
}
