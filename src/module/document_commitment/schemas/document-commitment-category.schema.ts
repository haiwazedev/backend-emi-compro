import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const documentCommitmentCategoryFieldsSchema = z
  .object({
    language_id: languageIdSchema,
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(100),
    description: z
      .string()
      .nullable()
      .optional()
      .transform((value) =>
        typeof value === 'string' && value.trim() === '' ? null : value,
      ),
  })
  .strict();

export const createDocumentCommitmentCategoryBodySchema =
  documentCommitmentCategoryFieldsSchema;
export const updateDocumentCommitmentCategoryBodySchema =
  documentCommitmentCategoryFieldsSchema
    .partial()
    .superRefine((input, context) => {
      const hasContent =
        input.name !== undefined ||
        input.slug !== undefined ||
        input.description !== undefined;

      if (hasContent && input.language_id === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'language_id is required when updating translated fields.',
          path: ['language_id'],
        });
      }

      if (input.language_id !== undefined && !hasContent) {
        context.addIssue({
          code: 'custom',
          message:
            'At least one translated field is required with language_id.',
          path: ['language_id'],
        });
      }
    });

export const documentCommitmentCategoryListQuerySchema = z
  .object({ language_id: languageIdSchema.optional() })
  .strict();

export type CreateDocumentCommitmentCategoryInput = z.infer<
  typeof createDocumentCommitmentCategoryBodySchema
>;
export type UpdateDocumentCommitmentCategoryInput = z.infer<
  typeof updateDocumentCommitmentCategoryBodySchema
>;
export type DocumentCommitmentCategoryListQuery = z.infer<
  typeof documentCommitmentCategoryListQuerySchema
>;
