import { z } from 'zod';

const positiveIdSchema = z.number().int().positive();

const serviceFieldsSchema = z
  .object({
    division_id: positiveIdSchema,
    name: z.string().trim().min(1).max(200),
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
