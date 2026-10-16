import { z } from 'zod';

const optionalTextSchema = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.string().trim().max(max).nullable().optional(),
  );

export const createInboxBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().max(254).pipe(z.email()),
    company: optionalTextSchema(200),
    phone: optionalTextSchema(30),
    inbox_subject_id: z.number().int().positive(),
    message: z.string().trim().min(1).max(5000),
  })
  .strict();

export const updateInboxBodySchema = z
  .object({
    is_read: z.boolean(),
  })
  .strict();

export const inboxListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().max(255).optional(),
    ),
    inbox_subject_id: z.coerce.number().int().positive().optional(),
  })
  .strict();

export type CreateInboxInput = z.infer<typeof createInboxBodySchema>;
export type UpdateInboxInput = z.infer<typeof updateInboxBodySchema>;
export type InboxListQuery = z.infer<typeof inboxListQuerySchema>;
