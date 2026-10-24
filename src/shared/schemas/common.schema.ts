import { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

const idSchema = z.coerce.number().int().positive();

// Language ids are lowercase codes ("id", "en"); any input case is accepted.
export const languageIdSchema = z.string().trim().toLowerCase().min(1).max(10);

export const bulkDeleteBodySchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1),
  })
  .strict();

export type BulkDeleteInput = z.infer<typeof bulkDeleteBodySchema>;

export function parseIdParam(value: string | string[]): number {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'ID must be a positive integer.');
  }

  const result = idSchema.safeParse(value);

  if (!result.success) {
    throw new ApiError(400, 'ID must be a positive integer.');
  }

  return result.data;
}
