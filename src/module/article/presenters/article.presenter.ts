import type { Prisma } from '../../../generated/prisma/client.js';

export type ArticleWithCategory = Prisma.ArticleGetPayload<{
  include: { articleCategory: true };
}>;

export function presentArticle(article: ArticleWithCategory) {
  return {
    id: article.id,
    article_category_id: article.articleCategoryId,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    issue_date: article.issueDate?.toISOString().slice(0, 10) ?? null,
    press_release_number: article.pressReleaseNumber,
    primary_photo_url: article.primaryPhotoUrl,
    cp_name: article.cpName,
    cp_role: article.cpRole,
    cp_phone_number: article.cpPhoneNumber,
    cp_email: article.cpEmail,
    status: article.status,
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
