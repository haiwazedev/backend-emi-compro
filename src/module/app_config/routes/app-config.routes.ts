import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { AppConfigController } from '../controllers/app-config.controller.js';

const controller = new AppConfigController();
const requireAuth = createAuthMiddleware(new AuthService());

export const appConfigRouter = Router();

appConfigRouter.get('/app_configs', requireAuth, controller.list);
