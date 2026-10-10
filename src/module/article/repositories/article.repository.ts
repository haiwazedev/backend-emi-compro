import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { ArticleListQuery } from '../schemas/article.schema.js';

export class ArticleRepository {
  findMany(query: ArticleListQuery) {
    const where = this.buildWhere(query);
    const direction = query.sort_order;

    return prisma.article.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ createdAt: direction }, { id: direction }],
      include: { articleCategory: true, primaryPhotoMedia: true },
    });
  }

  count(query: ArticleListQuery) {
    return prisma.article.count({ where: this.buildWhere(query) });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).article.findUnique({
      where: { id },
      include: { articleCategory: true, primaryPhotoMedia: true },
    });
  }

  findBySlug(slug: string) {
    return prisma.article.findUnique({ where: { slug }, select: { id: true } });
  }

  create(data: Prisma.ArticleUncheckedCreateInput) {
    return prisma.article.create({
      data,
      include: { articleCategory: true, primaryPhotoMedia: true },
    });
  }

  update(
    id: number,
    data: Prisma.ArticleUncheckedUpdateInput,
    transaction?: Prisma.TransactionClient,
  ) {
    return (transaction ?? prisma).article.update({
      where: { id },
      data,
      include: { articleCategory: true, primaryPhotoMedia: true },
    });
  }

  delete(id: number) {
    return prisma.article.delete({ where: { id } });
  }

  private buildWhere(query: ArticleListQuery): Prisma.ArticleWhereInput {
    return {
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.article_category_id
        ? { articleCategoryId: query.article_category_id }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
  }
}
