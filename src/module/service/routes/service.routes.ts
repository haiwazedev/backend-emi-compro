import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { ServiceController } from '../controllers/service.controller.js';
import {
  createServiceBodySchema,
  reorderServicesBodySchema,
  updateServiceBodySchema,
} from '../schemas/service.schema.js';

const controller = new ServiceController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const serviceRouter = Router();

serviceRouter.get('/services', controller.list);
serviceRouter.get('/services/:serviceId', controller.get);
serviceRouter.post(
  '/services/reorder',
  requireAuth,
  validateBody(reorderServicesBodySchema),
  controller.reorder,
);
serviceRouter.post(
  '/services',
  requireAuth,
  validateBody(createServiceBodySchema),
  controller.create,
);
serviceRouter.put(
  '/services/:serviceId',
  requireAuth,
  validateBody(updateServiceBodySchema),
  controller.update,
);
serviceRouter.delete('/services/:serviceId', requireAuth, controller.delete);
