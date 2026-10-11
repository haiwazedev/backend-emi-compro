import { z } from 'zod';

const documentCommitmentCategoryFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const createDocumentCommitmentCategoryBodySchema =
  documentCommitmentCategoryFieldsSchema;
export const updateDocumentCommitmentCategoryBodySchema =
  documentCommitmentCategoryFieldsSchema.partial();

export type CreateDocumentCommitmentCategoryInput = z.infer<
  typeof createDocumentCommitmentCategoryBodySchema
>;
export type UpdateDocumentCommitmentCategoryInput = z.infer<
  typeof updateDocumentCommitmentCategoryBodySchema
>;
