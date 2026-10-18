import { z } from 'zod';

export const updateRolePermissionBodySchema = z
  .object({ is_allowed: z.boolean() })
  .strict();

export type UpdateRolePermissionInput = z.infer<
  typeof updateRolePermissionBodySchema
>;
