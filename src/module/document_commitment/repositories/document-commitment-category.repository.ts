import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { DocumentCommitmentCategoryListQuery } from '../schemas/document-commitment-category.schema.js';

const categoryInclude = {
  contents: {
    include: { language: true },
    orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
  },
} satisfies Prisma.DocumentCommitmentCategoryInclude;

export type DocumentCommitmentCategoryContentWrite = {
  languageId: string;
  name?: string;
  slug?: string;
  description?: string | null;
};

export class DocumentCommitmentCategoryRepository {
  findMany(query: DocumentCommitmentCategoryListQuery) {
    return prisma.documentCommitmentCategory.findMany({
      where: query.language_id
        ? { contents: { some: { languageId: query.language_id } } }
        : {},
      orderBy: { id: 'asc' },
      include: categoryInclude,
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).documentCommitmentCategory.findUnique({
      where: { id },
      include: categoryInclude,
    });
  }

  findBySlug(slug: string, languageId: string) {
    return prisma.documentCommitmentCategoryContent.findUnique({
      where: { languageId_slug: { languageId, slug } },
      select: { documentCommitmentCategoryId: true },
    });
  }

  create(
    content: Required<
      Omit<DocumentCommitmentCategoryContentWrite, 'description'>
    > &
      Pick<DocumentCommitmentCategoryContentWrite, 'description'>,
  ) {
    return prisma.documentCommitmentCategory.create({
      data: { contents: { create: content } },
      include: categoryInclude,
    });
  }

  updateWithContent(
    id: number,
    content: DocumentCommitmentCategoryContentWrite,
  ) {
    return prisma.documentCommitmentCategory.update({
      where: { id },
      data: {
        contents: {
          upsert: {
            where: {
              documentCommitmentCategoryId_languageId: {
                documentCommitmentCategoryId: id,
                languageId: content.languageId,
              },
            },
            create: {
              languageId: content.languageId,
              name: content.name!,
              slug: content.slug!,
              description: content.description ?? null,
            },
            update: {
              ...(content.name !== undefined ? { name: content.name } : {}),
              ...(content.slug !== undefined ? { slug: content.slug } : {}),
              ...(content.description !== undefined
                ? { description: content.description }
                : {}),
            },
          },
        },
      },
      include: categoryInclude,
    });
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
