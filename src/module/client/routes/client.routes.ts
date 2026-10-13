import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { ClientController } from '../controllers/client.controller.js';
import {
  createClientBodySchema,
  reorderClientsBodySchema,
  updateClientBodySchema,
} from '../schemas/client.schema.js';

const controller = new ClientController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const clientRouter = Router();

clientRouter.get('/clients', controller.list);
clientRouter.get('/clients/:clientId', controller.get);
clientRouter.post(
  '/clients/reorder',
  requireAuth,
  validateBody(reorderClientsBodySchema),
  controller.reorder,
);
clientRouter.post(
  '/clients',
  requireAuth,
  validateBody(createClientBodySchema),
  controller.create,
);
clientRouter.put(
  '/clients/:clientId',
  requireAuth,
  validateBody(updateClientBodySchema),
  controller.update,
);
clientRouter.delete('/clients/:clientId', requireAuth, controller.delete);
