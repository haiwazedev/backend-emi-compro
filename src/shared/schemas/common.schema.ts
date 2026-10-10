import { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

const idSchema = z.coerce.number().int().positive();

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
