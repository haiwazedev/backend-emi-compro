import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        new ApiError(
          400,
          result.error.issues[0]?.message ?? 'Request body is invalid.',
        ),
      );
      return;
    }

    req.body = result.data;
    next();
  };
}
