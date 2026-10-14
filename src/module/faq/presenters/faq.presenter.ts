import type { Faq } from '../../../generated/prisma/client.js';

export function presentFaq(faq: Faq) {
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    status: faq.status,
    sort_order: faq.sortOrder,
    created_at: faq.createdAt.toISOString(),
    created_by: faq.createdBy,
    updated_at: faq.updatedAt?.toISOString() ?? null,
    updated_by: faq.updatedBy,
  };
}
