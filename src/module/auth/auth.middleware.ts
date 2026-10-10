import type { RequestHandler } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { AuthService } from './auth.service.js';

export function createAuthMiddleware(authService: AuthService): RequestHandler {
  return async (req, _res, next) => {
    const userId = req.session.userId;

    if (!userId) {
      next(new ApiError(401, 'Authentication is required.'));
      return;
    }

    req.authenticatedUser = await authService.getAuthenticatedUser(userId);
    next();
  };
}
