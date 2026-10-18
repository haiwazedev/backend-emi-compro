import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const positiveIdSchema = z.number().int().positive();
const descriptionSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  );
const mediaIdsSchema = z
  .array(positiveIdSchema)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'media_ids must contain unique IDs.',
  });

const serviceFieldsSchema = z
  .object({
    language_id: languageIdSchema,
    division_id: positiveIdSchema,
    name: z.string().trim().min(1).max(200),
    description: descriptionSchema,
    media_ids: mediaIdsSchema.optional(),
  })
  .strict();

export const createServiceBodySchema = serviceFieldsSchema;
export const updateServiceBodySchema = serviceFieldsSchema
  .partial()
  .superRefine((input, context) => {
    const hasContent =
      input.name !== undefined || input.description !== undefined;

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

export const reorderServicesBodySchema = z
  .object({
    division_id: positiveIdSchema,
    service_ids: z.array(positiveIdSchema),
  })
  .strict();

export type CreateServiceInput = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceBodySchema>;
export type ReorderServicesInput = z.infer<typeof reorderServicesBodySchema>;
