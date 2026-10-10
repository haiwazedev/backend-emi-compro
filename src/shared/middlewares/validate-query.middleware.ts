import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

export function validateQuery<TSchema extends z.ZodType>(
  schema: TSchema,
  localName: string,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(
        new ApiError(
          400,
          result.error.issues[0]?.message ?? 'Query parameters are invalid.',
        ),
      );
      return;
    }

    res.locals[localName] = result.data;
    next();
  };
}
