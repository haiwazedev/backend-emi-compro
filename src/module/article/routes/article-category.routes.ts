import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import {
  createAuthMiddleware,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { ArticleCategoryController } from '../controllers/article-category.controller.js';
import {
  createArticleCategoryBodySchema,
  updateArticleCategoryBodySchema,
} from '../schemas/article-category.schema.js';

const controller = new ArticleCategoryController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const articleCategoryRouter = Router();

articleCategoryRouter.get('/article_categories', controller.list);
articleCategoryRouter.get(
  '/article_categories/:articleCategoryId',
  controller.get,
);
articleCategoryRouter.post(
  '/article_categories',
  requireAuth,
  requireWrite,
  validateBody(createArticleCategoryBodySchema),
  controller.create,
);
articleCategoryRouter.put(
  '/article_categories/:articleCategoryId',
  requireAuth,
  requireWrite,
  validateBody(updateArticleCategoryBodySchema),
  controller.update,
);
articleCategoryRouter.delete(
  '/article_categories/:articleCategoryId',
  requireAuth,
  requireDelete,
  controller.delete,
);
