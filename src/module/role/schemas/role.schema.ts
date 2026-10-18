import { z } from 'zod';

const roleFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const createRoleBodySchema = roleFieldsSchema;
export const updateRoleBodySchema = roleFieldsSchema.partial();

export type CreateRoleInput = z.infer<typeof createRoleBodySchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleBodySchema>;
