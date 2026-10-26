import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import { DEFAULT_LANGUAGE_ID } from '../../language/services/language.service.js';
import type { DocumentCommitmentListQuery } from '../schemas/document-commitment.schema.js';

const documentContentOrderBy: Prisma.DocumentCommitmentContentOrderByWithRelationInput[] =
  [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }];
const categoryContentOrderBy: Prisma.DocumentCommitmentCategoryContentOrderByWithRelationInput[] =
  [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }];

const documentCommitmentInclude = {
  contents: {
    include: { language: true },
    orderBy: documentContentOrderBy,
  },
  documentCommitmentCategory: {
    include: {
      contents: {
        include: { language: true },
        orderBy: categoryContentOrderBy,
      },
    },
  },
} satisfies Prisma.DocumentCommitmentInclude;

const activeLanguageContent = {
  language: { isActive: true },
} satisfies Prisma.DocumentCommitmentContentWhereInput;

const publicDocumentCommitmentInclude = {
  contents: {
    ...documentCommitmentInclude.contents,
    where: activeLanguageContent,
  },
  documentCommitmentCategory: {
    include: {
      contents: {
        ...documentCommitmentInclude.documentCommitmentCategory.include
          .contents,
        where: { language: { isActive: true } },
      },
    },
  },
} satisfies Prisma.DocumentCommitmentInclude;

type DocumentCommitmentContentWrite = Pick<
  Prisma.DocumentCommitmentContentUncheckedCreateInput,
  'languageId' | 'title'
>;

export class DocumentCommitmentRepository {
  findMany(query: DocumentCommitmentListQuery, includeDrafts: boolean) {
    return prisma.documentCommitment.findMany({
      where: buildDocumentCommitmentWhere(query, includeDrafts),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      include: includeDrafts
        ? documentCommitmentInclude
        : publicDocumentCommitmentInclude,
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
      include: documentCommitmentInclude,
    });
  }

  findPublishedById(id: number) {
    return prisma.documentCommitment.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        contents: { some: activeLanguageContent },
      },
      include: publicDocumentCommitmentInclude,
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
    content: DocumentCommitmentContentWrite,
    transaction: Prisma.TransactionClient,
  ) {
    return transaction.documentCommitment.create({
      data: { ...data, contents: { create: content } },
      include: documentCommitmentInclude,
    });
  }

  updateWithContent(
    id: number,
    data: Prisma.DocumentCommitmentUncheckedUpdateInput,
    content: DocumentCommitmentContentWrite | undefined,
    transaction?: Prisma.TransactionClient,
  ) {
    const nestedContent = content
      ? {
          contents: {
            upsert: {
              where: {
                documentCommitmentId_languageId: {
                  documentCommitmentId: id,
                  languageId: content.languageId,
                },
              },
              create: content,
              update: { title: content.title },
            },
          },
        }
      : {};

    return (transaction ?? prisma).documentCommitment.update({
      where: { id },
      data: { ...data, ...nestedContent },
      include: documentCommitmentInclude,
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
  const contentWhere: Prisma.DocumentCommitmentContentWhereInput = {
    ...(query.language_id ? { languageId: query.language_id } : {}),
    ...(query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {}),
    ...(includeDrafts ? {} : { language: { isActive: true } }),
  };

  return {
    ...(query.search || query.language_id || !includeDrafts
      ? { contents: { some: contentWhere } }
      : {}),
    ...(query.document_commitment_category_id !== undefined
      ? {
          documentCommitmentCategoryId: query.document_commitment_category_id,
        }
      : {}),
    ...(query.document_commitment_category_slug
      ? {
          documentCommitmentCategory: {
            contents: {
              some: {
                languageId: query.language_id ?? DEFAULT_LANGUAGE_ID,
                slug: query.document_commitment_category_slug,
                ...(!includeDrafts ? { language: { isActive: true } } : {}),
              },
            },
          },
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    // Last, so the public view overrides any requested status.
    ...(includeDrafts ? {} : { status: 'PUBLISHED' }),
  };
}
