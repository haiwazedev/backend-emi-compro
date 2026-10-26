import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const documentCommitmentStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

const documentCommitmentFieldsSchema = z
  .object({
    document_commitment_category_id: z.coerce.number().int().positive(),
    language_id: languageIdSchema,
    title: z.string().trim().min(1).max(200),
    status: documentCommitmentStatusSchema.optional(),
  })
  .strict();

export const createDocumentCommitmentBodySchema =
  documentCommitmentFieldsSchema;
export const updateDocumentCommitmentBodySchema = documentCommitmentFieldsSchema
  .partial()
  .superRefine((input, context) => {
    if (input.title !== undefined && input.language_id === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'language_id is required when updating the translated title.',
        path: ['language_id'],
      });
    }

    if (input.language_id !== undefined && input.title === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'title is required when selecting a translation to update.',
        path: ['title'],
      });
    }
  });

export const documentCommitmentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    language_id: languageIdSchema.optional(),
    search: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().max(255).optional(),
    ),
    document_commitment_category_id: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    document_commitment_category_slug: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),
    status: documentCommitmentStatusSchema.optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.document_commitment_category_id !== undefined &&
      query.document_commitment_category_slug !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Use either document_commitment_category_id or document_commitment_category_slug, not both.',
        path: ['document_commitment_category_slug'],
      });
    }
  });

export type CreateDocumentCommitmentInput = z.infer<
  typeof createDocumentCommitmentBodySchema
>;
export type UpdateDocumentCommitmentInput = z.infer<
  typeof updateDocumentCommitmentBodySchema
>;
export type DocumentCommitmentListQuery = z.infer<
  typeof documentCommitmentListQuerySchema
>;
