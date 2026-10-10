import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
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
articleRouter.get('/articles/:articleId', controller.get);
articleRouter.post(
  '/articles',
  requireAuth,
  validateBody(createArticleBodySchema),
  controller.create,
);
articleRouter.put(
  '/articles/:articleId',
  requireAuth,
  validateBody(updateArticleBodySchema),
  controller.update,
);
articleRouter.delete('/articles/:articleId', requireAuth, controller.delete);
