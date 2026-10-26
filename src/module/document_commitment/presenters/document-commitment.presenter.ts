import {
  selectContent,
  type DocumentCommitmentCategoryView,
} from './document-commitment-category.presenter.js';

export type DocumentCommitmentView = {
  id: number;
  documentCommitmentCategoryId: number;
  contents: { languageId: string; title: string }[];
  filePath: string;
  filename: string;
  size: number;
  status: 'DRAFT' | 'PUBLISHED';
  uploadedAt: Date;
  uploadedBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  documentCommitmentCategory: DocumentCommitmentCategoryView;
};

export function presentDocumentCommitment(document: DocumentCommitmentView) {
  return {
    id: document.id,
    document_commitment_category_id: document.documentCommitmentCategoryId,
    contents: document.contents.map((content) => ({
      language_id: content.languageId,
      title: content.title,
    })),
    file_path: document.filePath,
    filename: document.filename,
    size: document.size,
    status: document.status,
    uploaded_at: document.uploadedAt.toISOString(),
    uploaded_by: document.uploadedBy,
    updated_at: document.updatedAt?.toISOString() ?? null,
    updated_by: document.updatedBy,
    document_commitment_category: {
      id: document.documentCommitmentCategory.id,
      contents: document.documentCommitmentCategory.contents.map((content) => ({
        language_id: content.languageId,
        name: content.name,
        slug: content.slug,
      })),
    },
  };
}

export function presentDocumentCommitmentListItem(
  document: DocumentCommitmentView,
  languageId?: string,
) {
  const content = selectContent(document.contents, languageId);
  const categoryContent = selectContent(
    document.documentCommitmentCategory.contents,
    languageId,
  );

  return {
    id: document.id,
    document_commitment_category_id: document.documentCommitmentCategoryId,
    language_id: content?.languageId ?? null,
    title: content?.title ?? null,
    file_path: document.filePath,
    filename: document.filename,
    size: document.size,
    status: document.status,
    uploaded_at: document.uploadedAt.toISOString(),
    uploaded_by: document.uploadedBy,
    updated_at: document.updatedAt?.toISOString() ?? null,
    updated_by: document.updatedBy,
    document_commitment_category: {
      id: document.documentCommitmentCategory.id,
      language_id: categoryContent?.languageId ?? null,
      name: categoryContent?.name ?? null,
      slug: categoryContent?.slug ?? null,
    },
  };
}
