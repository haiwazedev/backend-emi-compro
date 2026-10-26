import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';

export class DocumentCommitmentCategoryRepository {
  findMany() {
    return prisma.documentCommitmentCategory.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).documentCommitmentCategory.findUnique({
      where: { id },
    });
  }

  findBySlug(slug: string) {
    return prisma.documentCommitmentCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  create(data: Prisma.DocumentCommitmentCategoryCreateInput) {
    return prisma.documentCommitmentCategory.create({ data });
  }

  update(id: number, data: Prisma.DocumentCommitmentCategoryUpdateInput) {
    return prisma.documentCommitmentCategory.update({ where: { id }, data });
  }

  deleteWithDocuments(id: number) {
    return prisma.$transaction(async (transaction) => {
      const category = await transaction.documentCommitmentCategory.findUnique({
        where: { id },
        select: {
          documentCommitments: {
            select: { filename: true },
          },
        },
      });

      if (!category) return null;

      await transaction.documentCommitmentCategory.delete({ where: { id } });

      return category.documentCommitments;
    });
  }
}
