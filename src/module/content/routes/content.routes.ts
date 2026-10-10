import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { ContentController } from '../controllers/content.controller.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import {
  contentListQuerySchema,
  upsertContentsBodySchema,
} from '../schemas/content.schema.js';

const controller = new ContentController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const contentRouter = Router();

contentRouter.get(
  '/contents',
  validateQuery(contentListQuerySchema, 'contentListQuery'),
  controller.list,
);
contentRouter.put(
  '/contents',
  requireAuth,
  validateBody(upsertContentsBodySchema, { includeArrayIndexInError: true }),
  controller.upsert,
);
