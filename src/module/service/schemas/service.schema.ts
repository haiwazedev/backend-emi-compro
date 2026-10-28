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
const serviceMediaItemSchema = z
  .object({
    media_id: positiveIdSchema,
    description: descriptionSchema,
  })
  .strict();
const mediaSchema = z
  .array(serviceMediaItemSchema)
  .refine(
    (media) =>
      new Set(media.map((item) => item.media_id)).size === media.length,
    {
      message: 'media must contain unique media_id values.',
    },
  );

const serviceFieldsSchema = z
  .object({
    language_id: languageIdSchema,
    division_id: positiveIdSchema,
    name: z.string().trim().min(1).max(200),
    media: mediaSchema.optional(),
  })
  .strict();

export const createServiceBodySchema = serviceFieldsSchema;
export const updateServiceBodySchema = serviceFieldsSchema
  .partial()
  .superRefine((input, context) => {
    const hasTranslatedFields =
      input.name !== undefined || input.media !== undefined;

    if (hasTranslatedFields && input.language_id === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'language_id is required when updating name or media.',
        path: ['language_id'],
      });
    }

    if (input.language_id !== undefined && !hasTranslatedFields) {
      context.addIssue({
        code: 'custom',
        message: 'At least one of name or media is required with language_id.',
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
export type ServiceMediaInput = z.infer<typeof serviceMediaItemSchema>;
export type ReorderServicesInput = z.infer<typeof reorderServicesBodySchema>;
