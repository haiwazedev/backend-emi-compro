import { Router } from 'express';
import { validateBody } from '../../shared/middlewares/validate-body.middleware.js';
import { AuthController } from './auth.controller.js';
import { createAuthMiddleware } from './auth.middleware.js';
import { loginBodySchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';

const authService = new AuthService();
const authController = new AuthController(authService);
const requireAuth = createAuthMiddleware(authService);

export const authRouter = Router();

authRouter.post('/login', validateBody(loginBodySchema), authController.login);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/logout', authController.logout);
