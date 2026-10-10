import type { RequestHandler } from 'express';
import { frontendOrigin } from '../config/session.js';
import { ApiError } from '../errors/api-error.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const validateRequestOrigin: RequestHandler = (req, _res, next) => {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const requestOrigin = origin ? getOrigin(origin) : getOrigin(referer);

  if (requestOrigin !== frontendOrigin) {
    next(new ApiError(403, 'Request origin is not allowed.'));
    return;
  }

  next();
};

function getOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
