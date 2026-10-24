import type { PublicUser } from '../../module/auth/auth.types.ts';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: PublicUser;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    // Epoch ms of login; sessions older than the last password change are rejected.
    authenticatedAt?: number;
  }
}

export {};
