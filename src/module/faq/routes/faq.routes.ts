import { Router } from 'express';
import {
  createAuthMiddleware,
  includeDrafts,
  forceDraftUnlessPublisher,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { FaqController } from '../controllers/faq.controller.js';
import {
  createFaqBodySchema,
  faqListQuerySchema,
  reorderFaqsBodySchema,
  updateFaqBodySchema,
} from '../schemas/faq.schema.js';

const controller = new FaqController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const faqRouter = Router();

faqRouter.get(
  '/faqs',
  validateQuery(faqListQuerySchema, 'faqListQuery'),
  controller.list,
);
faqRouter.get('/faqs/:faqId', controller.get);
faqRouter.get(
  '/admin/faqs',
  requireAuth,
  includeDrafts,
  validateQuery(faqListQuerySchema, 'faqListQuery'),
  controller.list,
);
faqRouter.get('/admin/faqs/:faqId', requireAuth, includeDrafts, controller.get);
faqRouter.post(
  '/faqs/reorder',
  requireAuth,
  requireWrite,
  validateBody(reorderFaqsBodySchema),
  controller.reorder,
);
faqRouter.post(
  '/faqs',
  requireAuth,
  requireWrite,
  validateBody(createFaqBodySchema),
  forceDraftUnlessPublisher,
  controller.create,
);
faqRouter.put(
  '/faqs/:faqId',
  requireAuth,
  requireWrite,
  validateBody(updateFaqBodySchema),
  forceDraftUnlessPublisher,
  controller.update,
);
faqRouter.delete('/faqs/:faqId', requireAuth, requireDelete, controller.delete);
