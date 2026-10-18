import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import {
  sessionCookieName,
  sessionCookieOptions,
} from '../../shared/config/session.js';
import { AuthService } from './auth.service.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body);
    await establishSession(req, result.userId);
    res.status(200).json({ user: result.user });
  };

  me = (req: Request, res: Response): void => {
    if (!req.authenticatedUser) {
      throw new ApiError(401, 'Authentication is required.');
    }

    res.status(200).json({ user: req.authenticatedUser });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await destroySession(req);
    res.clearCookie(sessionCookieName, sessionCookieOptions);
    res.status(204).end();
  };
}

function establishSession(req: Request, userId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(new ApiError(503, 'Session service is unavailable.'));
        return;
      }

      req.session.userId = userId;
      req.session.save((saveError) => {
        if (saveError) {
          req.session.destroy(() => {
            reject(new ApiError(503, 'Session service is unavailable.'));
          });
          return;
        }

        resolve();
      });
    });
  });
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(new ApiError(503, 'Session service is unavailable.'));
        return;
      }

      resolve();
    });
  });
}
