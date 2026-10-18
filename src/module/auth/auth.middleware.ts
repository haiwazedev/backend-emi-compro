import type { Request, RequestHandler } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { AuthService } from './auth.service.js';
import type { Permission } from './auth.types.js';

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

// Use after requireAuth. Passes when the user has any of the given permissions.
export function requirePermission(
  ...permissions: Permission[]
): RequestHandler {
  return (req, _res, next) => {
    if (!permissions.some((permission) => hasPermission(req, permission))) {
      next(
        new ApiError(403, 'You do not have permission to perform this action.'),
      );
      return;
    }

    next();
  };
}

export function hasPermission(req: Request, permission: Permission): boolean {
  return req.authenticatedUser?.permissions.includes(permission) ?? false;
}

export const requireWrite = requirePermission('write', 'publish');
export const requireDelete = requirePermission('delete');
export const requireManageUsers = requirePermission('manage_users');

// Use after validateBody. Without publish, every save is stored as a draft.
export const forceDraftUnlessPublisher: RequestHandler = (req, _res, next) => {
  if (!hasPermission(req, 'publish')) {
    req.body = { ...req.body, status: 'DRAFT' };
  }

  next();
};
