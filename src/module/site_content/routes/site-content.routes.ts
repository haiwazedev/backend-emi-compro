import { Router } from 'express';
import {
  createAuthMiddleware,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { SiteContentController } from '../controllers/site-content.controller.js';
import {
  saveSiteContentsBodySchema,
  siteContentQuerySchema,
} from '../schemas/site-content.schema.js';

const controller = new SiteContentController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const siteContentRouter = Router();

siteContentRouter.get(
  '/site_contents',
  validateQuery(siteContentQuerySchema, 'siteContentQuery'),
  controller.list,
);
siteContentRouter.put(
  '/site_contents',
  requireAuth,
  requireWrite,
  validateBody(saveSiteContentsBodySchema, { includeArrayIndexInError: true }),
  controller.save,
);
