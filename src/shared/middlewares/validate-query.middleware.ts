import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiError, formatValidationPath } from '../errors/api-error.js';

export function validateQuery<TSchema extends z.ZodType>(
  schema: TSchema,
  localName: string,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const issue = result.error.issues[0];
      next(
        new ApiError(400, issue?.message ?? 'Query parameters are invalid.', {
          validationPath: formatValidationPath(issue?.path ?? []),
        }),
      );
      return;
    }

    res.locals[localName] = result.data;
    next();
  };
}
