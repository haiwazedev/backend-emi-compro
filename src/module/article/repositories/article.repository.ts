import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { ArticleListQuery } from '../schemas/article.schema.js';

export const articleInclude = {
  articleCategory: true,
  primaryPhotoMedia: true,
  contents: {
    include: { language: true },
    orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
  },
} satisfies Prisma.ArticleInclude;

// Public view: only published content in active languages.
const publicContent = {
  status: 'PUBLISHED',
  language: { isActive: true },
} satisfies Prisma.ArticleContentWhereInput;

const publicArticleInclude = {
  ...articleInclude,
  contents: { ...articleInclude.contents, where: publicContent },
} satisfies Prisma.ArticleInclude;

type ArticleContentData = Omit<
  Prisma.ArticleContentUncheckedCreateWithoutArticleInput,
  'createdBy'
>;

export class ArticleRepository {
  findMany(query: ArticleListQuery, includeDrafts: boolean) {
    const where = buildArticleWhere(query, includeDrafts);
    const direction = query.sort_order;
    // Issue date and updated_at are nullable; undated articles go last.
    const orderBy: Prisma.ArticleOrderByWithRelationInput[] =
      query.sort_by === 'issue_date'
        ? [
            { issueDate: { sort: direction, nulls: 'last' } },
            { updatedAt: { sort: direction, nulls: 'last' } },
            { id: direction },
          ]
        : [{ createdAt: direction }, { id: direction }];

    return prisma.article.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy,
      include: includeDrafts ? articleInclude : publicArticleInclude,
    });
  }

  count(query: ArticleListQuery, includeDrafts: boolean) {
    return prisma.article.count({
      where: buildArticleWhere(query, includeDrafts),
    });
  }

  countAll() {
    return prisma.article.count();
  }

  countContentsByLanguageAndStatus() {
    return prisma.articleContent.groupBy({
      by: ['languageId', 'status'],
      _count: { _all: true },
    });
  }

  findById(id: number, includeDrafts = true) {
    if (includeDrafts) {
      return prisma.article.findUnique({
        where: { id },
        include: articleInclude,
      });
    }

    return prisma.article.findFirst({
      where: { id, contents: { some: publicContent } },
      include: publicArticleInclude,
    });
  }

  findPublishedBySlug(slug: string) {
    return prisma.article.findFirst({
      where: { contents: { some: { ...publicContent, slug } } },
      include: publicArticleInclude,
    });
  }

  findContentBySlug(slug: string) {
    return prisma.articleContent.findUnique({
      where: { slug },
      select: { articleId: true, languageId: true },
    });
  }

  // Nested write: Prisma inserts the article first, then its content, in one transaction.
  create(
    data: Omit<Prisma.ArticleUncheckedCreateInput, 'contents'>,
    content: ArticleContentData,
  ) {
    return prisma.article.create({
      data: {
        ...data,
        contents: { create: { ...content, createdBy: data.createdBy } },
      },
      include: articleInclude,
    });
  }

  updateWithContent(
    id: number,
    data: Omit<Prisma.ArticleUncheckedUpdateInput, 'contents'>,
    content: ArticleContentData,
    userName: string,
  ) {
    return prisma.article.update({
      where: { id },
      data: {
        ...data,
        contents: {
          upsert: {
            where: {
              articleId_languageId: {
                articleId: id,
                languageId: content.languageId,
              },
            },
            create: { ...content, createdBy: userName },
            update: { ...content, updatedBy: userName, updatedAt: new Date() },
          },
        },
      },
      include: articleInclude,
    });
  }

  delete(id: number) {
    return prisma.article.delete({ where: { id } });
  }

  deleteMany(ids: number[]) {
    return prisma.article.deleteMany({ where: { id: { in: ids } } });
  }
}

export function buildArticleWhere(
  query: ArticleListQuery,
  includeDrafts: boolean,
): Prisma.ArticleWhereInput {
  // One content row must match every content filter together.
  const contentWhere: Prisma.ArticleContentWhereInput = {
    ...(query.language_id ? { languageId: query.language_id } : {}),
    ...(query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    // Last, so the public view overrides any requested status.
    ...(includeDrafts ? {} : publicContent),
  };

  return {
    ...(query.article_category_id !== undefined
      ? { articleCategoryId: query.article_category_id }
      : {}),
    ...(query.article_category_slug
      ? { articleCategory: { slug: query.article_category_slug } }
      : {}),
    ...(Object.keys(contentWhere).length > 0
      ? { contents: { some: contentWhere } }
      : {}),
  };
}
