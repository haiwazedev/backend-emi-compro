import type { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { ArticleCategoryService } from '../services/article-category.service.js';
import { presentArticleCategory } from '../presenters/article-category.presenter.js';
import type {
  CreateArticleCategoryInput,
  UpdateArticleCategoryInput,
} from '../schemas/article-category.schema.js';

export class ArticleCategoryController {
  constructor(private readonly service = new ArticleCategoryService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.service.list();

    res.status(200).json({
      articleCategories: categories.map(presentArticleCategory),
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.getById(
      parseIdParam(req.params.articleCategoryId),
    );

    res.status(200).json({ articleCategory: presentArticleCategory(category) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.create(
      req.body as CreateArticleCategoryInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({ articleCategory: presentArticleCategory(category) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.update(
      parseIdParam(req.params.articleCategoryId),
      req.body as UpdateArticleCategoryInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ articleCategory: presentArticleCategory(category) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.articleCategoryId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
