import type { Request } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';

export type AuthenticatedUser = {
  id: number;
  name: string;
};

// Only valid on routes behind requireAuth.
export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  const userId = req.session.userId;

  if (!userId || !req.authenticatedUser) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return { id: userId, name: req.authenticatedUser.name };
}
