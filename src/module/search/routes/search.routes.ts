import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { SearchController } from '../controllers/search.controller.js';
import { searchQuerySchema } from '../schemas/search.schema.js';

const controller = new SearchController();
const requireAuth = createAuthMiddleware(new AuthService());

export const searchRouter = Router();

// Admin-only: matches drafts as well as published content.
searchRouter.get(
  '/admin/search',
  requireAuth,
  validateQuery(searchQuerySchema, 'searchQuery'),
  controller.search,
);
