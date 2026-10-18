import { Router } from 'express';
import {
  createAuthMiddleware,
  requireDelete,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { InboxController } from '../controllers/inbox.controller.js';
import {
  createInboxBodySchema,
  inboxListQuerySchema,
  updateInboxBodySchema,
} from '../schemas/inbox.schema.js';

const controller = new InboxController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const inboxRouter = Router();

inboxRouter.get('/inbox-subjects', controller.listSubjects);
inboxRouter.get(
  '/inboxes',
  requireAuth,
  validateQuery(inboxListQuerySchema, 'inboxListQuery'),
  controller.list,
);
inboxRouter.get('/inboxes/counts', requireAuth, controller.counts);
inboxRouter.post(
  '/inboxes',
  validateBody(createInboxBodySchema),
  controller.create,
);
inboxRouter.post('/inboxes/read-all', requireAuth, controller.markAllRead);
inboxRouter.put(
  '/inboxes/:inboxId',
  requireAuth,
  validateBody(updateInboxBodySchema),
  controller.update,
);
inboxRouter.delete(
  '/inboxes/:inboxId',
  requireAuth,
  requireDelete,
  controller.delete,
);
