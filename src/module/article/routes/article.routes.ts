import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { bulkDeleteBodySchema } from '../../../shared/schemas/common.schema.js';
import {
  createAuthMiddleware,
  includeDrafts,
  forceDraftUnlessPublisher,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { ArticleController } from '../controllers/article.controller.js';
import {
  articleListQuerySchema,
  createArticleBodySchema,
  updateArticleBodySchema,
} from '../schemas/article.schema.js';

const controller = new ArticleController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const articleRouter = Router();

articleRouter.get(
  '/articles',
  validateQuery(articleListQuerySchema, 'articleListQuery'),
  controller.list,
);
// Registered before `/articles/:articleId` so "count" isn't read as an id.
articleRouter.get('/articles/count', requireAuth, controller.counts);
articleRouter.get('/articles/slug/:slug', controller.getBySlug);
articleRouter.get('/articles/:articleId', controller.get);
articleRouter.get(
  '/admin/articles',
  requireAuth,
  includeDrafts,
  validateQuery(articleListQuerySchema, 'articleListQuery'),
  controller.list,
);
articleRouter.get(
  '/admin/articles/:articleId',
  requireAuth,
  includeDrafts,
  controller.get,
);
articleRouter.post(
  '/articles',
  requireAuth,
  requireWrite,
  validateBody(createArticleBodySchema),
  forceDraftUnlessPublisher,
  controller.create,
);
articleRouter.put(
  '/articles/:articleId',
  requireAuth,
  requireWrite,
  validateBody(updateArticleBodySchema),
  forceDraftUnlessPublisher,
  controller.update,
);
articleRouter.delete(
  '/articles/:articleId',
  requireAuth,
  requireDelete,
  controller.delete,
);
articleRouter.post(
  '/articles/bulk_delete',
  requireAuth,
  requireDelete,
  validateBody(bulkDeleteBodySchema),
  controller.bulkDelete,
);
