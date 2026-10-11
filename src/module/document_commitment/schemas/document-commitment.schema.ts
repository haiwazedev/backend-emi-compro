import { z } from 'zod';

const documentCommitmentStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

const documentCommitmentFieldsSchema = z
  .object({
    document_commitment_category_id: z.coerce.number().int().positive(),
    title: z.string().trim().min(1).max(200),
    status: documentCommitmentStatusSchema.optional(),
  })
  .strict();

export const createDocumentCommitmentBodySchema =
  documentCommitmentFieldsSchema;
export const updateDocumentCommitmentBodySchema =
  documentCommitmentFieldsSchema.partial();

export const documentCommitmentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().max(255).optional(),
    ),
    document_commitment_category_id: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    status: documentCommitmentStatusSchema.optional(),
  })
  .strict();

export type CreateDocumentCommitmentInput = z.infer<
  typeof createDocumentCommitmentBodySchema
>;
export type UpdateDocumentCommitmentInput = z.infer<
  typeof updateDocumentCommitmentBodySchema
>;
export type DocumentCommitmentListQuery = z.infer<
  typeof documentCommitmentListQuerySchema
>;
