export type DocumentCommitmentCategoryView = {
  id: number;
  name: string;
  slug: string;
};

export function presentDocumentCommitmentCategory(
  category: DocumentCommitmentCategoryView,
) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}
