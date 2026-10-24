import { z } from 'zod';

const userFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email('Email must be valid.'),
    role_id: z.number().int().positive().nullable(),
    is_active: z.boolean(),
  })
  .strict();

export const userListQuerySchema = z
  .object({
    search: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().max(200).optional(),
    ),
    role_id: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// New users start inactive until they accept the emailed invite.
export const createUserBodySchema = userFieldsSchema.omit({ is_active: true });
export const updateUserBodySchema = userFieldsSchema.partial();

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserBodySchema>;
export type UpdateUserInput = z.infer<typeof updateUserBodySchema>;
