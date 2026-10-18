import { z } from 'zod';

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
    division_id: positiveIdSchema,
    name: z.string().trim().min(1).max(200),
    description: descriptionSchema,
    media_ids: mediaIdsSchema.optional(),
  })
  .strict();

export const createServiceBodySchema = serviceFieldsSchema;
export const updateServiceBodySchema = serviceFieldsSchema.partial();

export const reorderServicesBodySchema = z
  .object({
    division_id: positiveIdSchema,
    service_ids: z.array(positiveIdSchema),
  })
  .strict();

export type CreateServiceInput = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceBodySchema>;
export type ReorderServicesInput = z.infer<typeof reorderServicesBodySchema>;
