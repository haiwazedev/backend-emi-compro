export type ArticleCategoryView = {
  id: number;
  name: string;
  slug: string;
};

export function presentArticleCategory(category: ArticleCategoryView) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}
