import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { FaqListQuery } from '../schemas/faq.schema.js';

export class FaqRepository {
  findMany(query: FaqListQuery) {
    return prisma.faq.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: number) {
    return prisma.faq.findUnique({ where: { id } });
  }

  create(data: Prisma.FaqUncheckedCreateInput) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.faq.aggregate({
        _max: { sortOrder: true },
      });

      return transaction.faq.create({
        data: { ...data, sortOrder: (current._max.sortOrder ?? 0) + 1 },
      });
    });
  }

  update(id: number, data: Prisma.FaqUncheckedUpdateInput) {
    return prisma.faq.update({ where: { id }, data });
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
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
    });
  }
}

async function compactFaqs(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const faqs = await transaction.faq.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
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
