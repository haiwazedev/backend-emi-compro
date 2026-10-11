import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { DocumentCommitmentListQuery } from '../schemas/document-commitment.schema.js';

const documentInclude = {
  documentCommitmentCategory: true,
} satisfies Prisma.DocumentCommitmentInclude;

export class DocumentCommitmentRepository {
  findMany(query: DocumentCommitmentListQuery) {
    return prisma.documentCommitment.findMany({
      where: this.buildWhere(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      include: documentInclude,
    });
  }

  count(query: DocumentCommitmentListQuery) {
    return prisma.documentCommitment.count({ where: this.buildWhere(query) });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).documentCommitment.findUnique({
      where: { id },
      include: documentInclude,
    });
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

  private buildWhere(
    query: DocumentCommitmentListQuery,
  ): Prisma.DocumentCommitmentWhereInput {
    return {
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.document_commitment_category_id
        ? {
            documentCommitmentCategoryId: query.document_commitment_category_id,
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
  }
}
