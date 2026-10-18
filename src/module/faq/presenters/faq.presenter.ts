import type { Language, Prisma } from '../../../generated/prisma/client.js';
import type { faqInclude } from '../repositories/faq.repository.js';

export type FaqWithContents = Prisma.FaqGetPayload<{
  include: typeof faqInclude;
}>;

type FaqContent = FaqWithContents['contents'][number];

export function presentFaq(faq: FaqWithContents) {
  return {
    ...presentFaqHeader(faq),
    contents: faq.contents.map(presentFaqContent),
  };
}

// List row: content fields come from `languageId` when given, else the first language with content.
export function presentFaqListItem(
  faq: FaqWithContents,
  languages: Language[],
  languageId?: string,
) {
  const content = languageId
    ? faq.contents.find((item) => item.languageId === languageId)
    : faq.contents[0];

  return {
    ...presentFaqHeader(faq),
    language_id: content?.languageId ?? null,
    question: content?.question ?? null,
    answer: content?.answer ?? null,
    status: content?.status ?? null,
    languages: languages.map((language) => ({
      language_id: language.id,
      status:
        faq.contents.find((item) => item.languageId === language.id)?.status ??
        null,
    })),
  };
}

function presentFaqHeader(faq: FaqWithContents) {
  return {
    id: faq.id,
    sort_order: faq.sortOrder,
    created_at: faq.createdAt.toISOString(),
    created_by: faq.createdBy,
    updated_at: faq.updatedAt?.toISOString() ?? null,
    updated_by: faq.updatedBy,
  };
}

function presentFaqContent(content: FaqContent) {
  return {
    id: content.id,
    language_id: content.languageId,
    question: content.question,
    answer: content.answer,
    status: content.status,
    created_at: content.createdAt.toISOString(),
    created_by: content.createdBy,
    updated_at: content.updatedAt?.toISOString() ?? null,
    updated_by: content.updatedBy,
  };
}
