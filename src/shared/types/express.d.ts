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
  }
}

export {};
