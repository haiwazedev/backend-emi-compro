import { z } from 'zod';

const clientFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const createClientBodySchema = clientFieldsSchema;
export const updateClientBodySchema = clientFieldsSchema.partial();

export const reorderClientsBodySchema = z
  .object({
    client_ids: z.array(z.number().int().positive()),
  })
  .strict();

export type CreateClientInput = z.infer<typeof createClientBodySchema>;
export type UpdateClientInput = z.infer<typeof updateClientBodySchema>;
export type ReorderClientsInput = z.infer<typeof reorderClientsBodySchema>;
