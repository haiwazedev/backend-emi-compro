import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { FaqListQuery } from '../schemas/faq.schema.js';

export const faqInclude = {
  contents: {
    orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
  },
} satisfies Prisma.FaqInclude;

const publicContent = {
  status: 'PUBLISHED',
  language: { isActive: true },
} satisfies Prisma.FaqContentWhereInput;

const publicFaqInclude = {
  contents: { ...faqInclude.contents, where: publicContent },
} satisfies Prisma.FaqInclude;

const faqOrder = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

type FaqContentData = Omit<
  Prisma.FaqContentUncheckedCreateWithoutFaqInput,
  'createdBy'
>;

export class FaqRepository {
  findMany(query: FaqListQuery, includeDrafts: boolean) {
    // One content row must match every content filter together.
    const contentWhere: Prisma.FaqContentWhereInput = {
      ...(query.language_id ? { languageId: query.language_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      // Last, so the public view overrides any requested status.
      ...(includeDrafts ? {} : publicContent),
    };

    return prisma.faq.findMany({
      where:
        Object.keys(contentWhere).length > 0
          ? { contents: { some: contentWhere } }
          : {},
      orderBy: [...faqOrder],
      include: includeDrafts ? faqInclude : publicFaqInclude,
    });
  }

  findById(id: number, includeDrafts = true) {
    if (includeDrafts) {
      return prisma.faq.findUnique({ where: { id }, include: faqInclude });
    }

    return prisma.faq.findFirst({
      where: { id, contents: { some: publicContent } },
      include: publicFaqInclude,
    });
  }

  create(content: FaqContentData, userName: string) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.faq.aggregate({
        _max: { sortOrder: true },
      });

      return transaction.faq.create({
        data: {
          sortOrder: (current._max.sortOrder ?? 0) + 1,
          createdBy: userName,
          contents: { create: { ...content, createdBy: userName } },
        },
        include: faqInclude,
      });
    });
  }

  updateWithContent(id: number, content: FaqContentData, userName: string) {
    return prisma.faq.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        updatedBy: userName,
        contents: {
          upsert: {
            where: {
              faqId_languageId: { faqId: id, languageId: content.languageId },
            },
            create: { ...content, createdBy: userName },
            update: { ...content, updatedBy: userName, updatedAt: new Date() },
          },
        },
      },
      include: faqInclude,
    });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      await transaction.faq.delete({ where: { id } });
      await compactFaqs(transaction);
    });
  }

  reorder(faqIds: number[]) {
    return prisma.$transaction(async (transaction) => {
      const faqs = await transaction.faq.findMany({ select: { id: true } });

      if (
        !containsEveryIdOnce(
          faqIds,
          faqs.map(({ id }) => id),
        )
      ) {
        return null;
      }

      for (const [index, id] of faqIds.entries()) {
        await transaction.faq.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      }

      return transaction.faq.findMany({
        orderBy: [...faqOrder],
        include: faqInclude,
      });
    });
  }
}

async function compactFaqs(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const faqs = await transaction.faq.findMany({
    orderBy: [...faqOrder],
    select: { id: true, sortOrder: true },
  });

  for (const [index, faq] of faqs.entries()) {
    const sortOrder = index + 1;

    if (faq.sortOrder !== sortOrder) {
      await transaction.faq.update({
        where: { id: faq.id },
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
