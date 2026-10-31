export type DocumentCommitmentCategoryView = {
  id: number;
  contents: {
    languageId: string;
    name: string;
    slug: string;
    description: string | null;
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
      description: content.description,
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
    description: content?.description ?? null,
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
