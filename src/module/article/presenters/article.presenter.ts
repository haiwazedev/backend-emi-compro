import type { Language, Prisma } from '../../../generated/prisma/client.js';
import type { articleInclude } from '../repositories/article.repository.js';

export type ArticleWithContents = Prisma.ArticleGetPayload<{
  include: typeof articleInclude;
}>;

type ArticleContentWithLanguage = ArticleWithContents['contents'][number];

export function presentArticle(article: ArticleWithContents) {
  return {
    ...presentArticleHeader(article),
    contents: article.contents.map(presentArticleContent),
  };
}

// List row: content fields come from `languageId` when given, else the first language with content.
export function presentArticleListItem(
  article: ArticleWithContents,
  languages: Language[],
  languageId?: string,
) {
  const content = languageId
    ? article.contents.find((item) => item.languageId === languageId)
    : article.contents[0];

  return {
    ...presentArticleHeader(article),
    language_id: content?.languageId ?? null,
    title: content?.title ?? null,
    slug: content?.slug ?? null,
    summary: content?.summary ?? null,
    status: content?.status ?? null,
    read_time: content?.readTime ?? null,
    languages: languages.map((language) => ({
      language_id: language.id,
      status:
        article.contents.find((item) => item.languageId === language.id)
          ?.status ?? null,
    })),
  };
}

function presentArticleHeader(article: ArticleWithContents) {
  return {
    id: article.id,
    article_category_id: article.articleCategoryId,
    issue_date: article.issueDate?.toISOString().slice(0, 10) ?? null,
    press_release_number: article.pressReleaseNumber,
    primary_photo: article.primaryPhotoMediaId,
    primary_photo_url: article.primaryPhotoMedia?.path ?? null,
    cp_name: article.cpName,
    cp_role: article.cpRole,
    cp_phone_number: article.cpPhoneNumber,
    cp_email: article.cpEmail,
    created_at: article.createdAt.toISOString(),
    created_by: article.createdBy,
    updated_at: article.updatedAt?.toISOString() ?? null,
    updated_by: article.updatedBy,
    article_category: {
      id: article.articleCategory.id,
      name: article.articleCategory.name,
      slug: article.articleCategory.slug,
    },
  };
}

function presentArticleContent(content: ArticleContentWithLanguage) {
  return {
    id: content.id,
    language_id: content.languageId,
    title: content.title,
    slug: content.slug,
    summary: content.summary,
    content: content.content,
    status: content.status,
    read_time: content.readTime,
    created_at: content.createdAt.toISOString(),
    created_by: content.createdBy,
    updated_at: content.updatedAt?.toISOString() ?? null,
    updated_by: content.updatedBy,
  };
}
