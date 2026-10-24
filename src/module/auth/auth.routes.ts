import { Router } from 'express';
import { createRateLimit } from '../../shared/middlewares/rate-limit.middleware.js';
import { validateBody } from '../../shared/middlewares/validate-body.middleware.js';
import { AuthController } from './auth.controller.js';
import { createAuthMiddleware } from './auth.middleware.js';
import {
  activateBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  verifyTokenBodySchema,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';

const authService = new AuthService();
const authController = new AuthController(authService);
const requireAuth = createAuthMiddleware(authService);

const forgotPasswordRateLimit = createRateLimit({
  name: 'forgot-password',
  limit: 5,
  windowSeconds: 15 * 60,
  limitMessage: 'Too many password reset requests. Please try again later.',
  unavailableMessage: 'Password reset is temporarily unavailable.',
});
const activateRateLimit = createRateLimit({
  name: 'activate',
  limit: 10,
  windowSeconds: 15 * 60,
  limitMessage: 'Too many attempts. Please try again later.',
  unavailableMessage: 'Account activation is temporarily unavailable.',
});

const verifyTokenRateLimit = createRateLimit({
  name: 'activate-verify',
  limit: 20,
  windowSeconds: 15 * 60,
  limitMessage: 'Too many attempts. Please try again later.',
  unavailableMessage: 'Account activation is temporarily unavailable.',
});

export const authRouter = Router();

authRouter.post('/login', validateBody(loginBodySchema), authController.login);
authRouter.post(
  '/forgot-password',
  forgotPasswordRateLimit,
  validateBody(forgotPasswordBodySchema),
  authController.forgotPassword,
);
authRouter.post(
  '/activate/verify',
  verifyTokenRateLimit,
  validateBody(verifyTokenBodySchema),
  authController.verifyToken,
);
authRouter.post(
  '/activate',
  activateRateLimit,
  validateBody(activateBodySchema),
  authController.activate,
);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/logout', authController.logout);
