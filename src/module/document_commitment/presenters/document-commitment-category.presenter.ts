export type DocumentCommitmentCategoryView = {
  id: number;
  contents: {
    languageId: string;
    name: string;
    slug: string;
  }[];
};

export function presentDocumentCommitmentCategory(
  category: DocumentCommitmentCategoryView,
) {
  return {
    id: category.id,
    contents: category.contents.map((content) => ({
      language_id: content.languageId,
      name: content.name,
      slug: content.slug,
    })),
  };
}

export function presentDocumentCommitmentCategoryListItem(
  category: DocumentCommitmentCategoryView,
  languageId?: string,
) {
  const content = selectContent(category.contents, languageId);

  return {
    id: category.id,
    language_id: content?.languageId ?? null,
    name: content?.name ?? null,
    slug: content?.slug ?? null,
  };
}

export function selectContent<T extends { languageId: string }>(
  contents: T[],
  languageId?: string,
): T | undefined {
  return languageId
    ? contents.find((content) => content.languageId === languageId)
    : contents[0];
}
