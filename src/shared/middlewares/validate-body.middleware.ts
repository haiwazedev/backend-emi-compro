import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiError, formatValidationPath } from '../errors/api-error.js';

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
  options: { includeArrayIndexInError?: boolean } = {},
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issue = result.error.issues[0];
      const arrayIndex = options.includeArrayIndexInError
        ? // First numeric segment, so nested arrays like `items[2]` are reported too.
          issue?.path.find((segment) => typeof segment === 'number')
        : undefined;
      const message =
        typeof arrayIndex === 'number'
          ? `Item at index ${arrayIndex}: ${issue.message}`
          : (issue?.message ?? 'Request body is invalid.');

      next(
        new ApiError(400, message, {
          validationPath: formatValidationPath(issue?.path ?? []),
        }),
      );
      return;
    }

    req.body = result.data;
    next();
  };
}
