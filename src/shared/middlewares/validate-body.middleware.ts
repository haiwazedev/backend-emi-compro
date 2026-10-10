import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
  options: { includeArrayIndexInError?: boolean } = {},
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issue = result.error.issues[0];
      const arrayIndex = options.includeArrayIndexInError
        ? issue?.path[0]
        : undefined;
      const message =
        typeof arrayIndex === 'number'
          ? `Item at index ${arrayIndex}: ${issue.message}`
          : (issue?.message ?? 'Request body is invalid.');

      next(new ApiError(400, message));
      return;
    }

    req.body = result.data;
    next();
  };
}
