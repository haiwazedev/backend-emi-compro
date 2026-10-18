import { z } from 'zod';

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
    name: z.string().trim().min(1).max(200),
    abbr: z.string().trim().min(1).max(50),
    icon_svg: z.string().nullable().optional(),
    description: descriptionSchema,
    status: divisionStatusSchema.optional(),
  })
  .strict();

export const createDivisionBodySchema = divisionFieldsSchema;
export const updateDivisionBodySchema = divisionFieldsSchema.partial();

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
