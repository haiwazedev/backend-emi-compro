import type { DocumentCommitmentCategoryView } from './document-commitment-category.presenter.js';

export type DocumentCommitmentView = {
  id: number;
  documentCommitmentCategoryId: number;
  title: string;
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
    title: document.title,
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
      name: document.documentCommitmentCategory.name,
    },
  };
}
