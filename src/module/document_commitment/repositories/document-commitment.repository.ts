import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { DocumentCommitmentListQuery } from '../schemas/document-commitment.schema.js';

const documentInclude = {
  documentCommitmentCategory: true,
} satisfies Prisma.DocumentCommitmentInclude;

export class DocumentCommitmentRepository {
  findMany(query: DocumentCommitmentListQuery, includeDrafts: boolean) {
    return prisma.documentCommitment.findMany({
      where: buildDocumentCommitmentWhere(query, includeDrafts),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      include: documentInclude,
    });
  }

  count(query: DocumentCommitmentListQuery, includeDrafts: boolean) {
    return prisma.documentCommitment.count({
      where: buildDocumentCommitmentWhere(query, includeDrafts),
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).documentCommitment.findUnique({
      where: { id },
      include: documentInclude,
    });
  }

  findPublishedById(id: number) {
    return prisma.documentCommitment.findUnique({
      where: { id, status: 'PUBLISHED' },
      include: documentInclude,
    });
  }

  async isPublishedFilename(filename: string): Promise<boolean> {
    const document = await prisma.documentCommitment.findUnique({
      where: { filename },
      select: { status: true },
    });

    return document?.status === 'PUBLISHED';
  }

  create(
    data: Prisma.DocumentCommitmentUncheckedCreateInput,
    transaction: Prisma.TransactionClient,
  ) {
    return transaction.documentCommitment.create({
      data,
      include: documentInclude,
    });
  }

  update(
    id: number,
    data: Prisma.DocumentCommitmentUncheckedUpdateInput,
    transaction?: Prisma.TransactionClient,
  ) {
    return (transaction ?? prisma).documentCommitment.update({
      where: { id },
      data,
      include: documentInclude,
    });
  }

  deleteWithFile(id: number) {
    return prisma.$transaction(async (transaction) => {
      const document = await transaction.documentCommitment.findUnique({
        where: { id },
        select: { filename: true },
      });

      if (!document) return null;

      await transaction.documentCommitment.delete({ where: { id } });
      return document;
    });
  }

  deleteManyWithFiles(ids: number[]) {
    return prisma.$transaction(async (transaction) => {
      const where = { id: { in: ids } };
      const documents = await transaction.documentCommitment.findMany({
        where,
        select: { filename: true },
      });

      await transaction.documentCommitment.deleteMany({ where });
      return documents;
    });
  }
}

export function buildDocumentCommitmentWhere(
  query: DocumentCommitmentListQuery,
  includeDrafts: boolean,
): Prisma.DocumentCommitmentWhereInput {
  return {
    ...(query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {}),
    ...(query.document_commitment_category_id !== undefined
      ? {
          documentCommitmentCategoryId: query.document_commitment_category_id,
        }
      : {}),
    ...(query.document_commitment_category_slug
      ? {
          documentCommitmentCategory: {
            slug: query.document_commitment_category_slug,
          },
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    // Last, so the public view overrides any requested status.
    ...(includeDrafts ? {} : { status: 'PUBLISHED' }),
  };
}
