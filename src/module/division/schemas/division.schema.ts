import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const divisionStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
const descriptionSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  );

const divisionFieldsSchema = z
  .object({
    language_id: languageIdSchema,
    name: z.string().trim().min(1).max(200),
    abbr: z.string().trim().min(1).max(50),
    icon_svg: z.string().nullable().optional(),
    description: descriptionSchema,
    status: divisionStatusSchema.optional(),
  })
  .strict();

export const createDivisionBodySchema = divisionFieldsSchema;
export const updateDivisionBodySchema = divisionFieldsSchema
  .partial()
  .superRefine((input, context) => {
    const hasContent =
      input.name !== undefined ||
      input.abbr !== undefined ||
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
        message: 'At least one translated field is required with language_id.',
        path: ['language_id'],
      });
    }
  });

export const divisionListQuerySchema = z
  .object({
    status: divisionStatusSchema.optional(),
  })
  .strict();

export const reorderDivisionsBodySchema = z
  .object({
    division_ids: z.array(z.number().int().positive()),
  })
  .strict();

export type CreateDivisionInput = z.infer<typeof createDivisionBodySchema>;
export type UpdateDivisionInput = z.infer<typeof updateDivisionBodySchema>;
export type DivisionListQuery = z.infer<typeof divisionListQuerySchema>;
export type ReorderDivisionsInput = z.infer<typeof reorderDivisionsBodySchema>;
