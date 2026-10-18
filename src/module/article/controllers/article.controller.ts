import type { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { ArticleService } from '../services/article.service.js';
import {
  presentArticle,
  presentArticleListItem,
} from '../presenters/article.presenter.js';
import type {
  ArticleListQuery,
  CreateArticleInput,
  UpdateArticleInput,
} from '../schemas/article.schema.js';

export class ArticleController {
  constructor(private readonly service = new ArticleService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.articleListQuery as ArticleListQuery;
    const result = await this.service.list(query);

    res.status(200).json({
      articles: result.articles.map((article) =>
        presentArticleListItem(article, result.languages, query.language_id),
      ),
      pagination: result.pagination,
    });
  };

  counts = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.service.counts());
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const article = await this.service.getById(
      parseIdParam(req.params.articleId),
    );

    res.status(200).json({ article: presentArticle(article) });
  };

  getBySlug = async (req: Request, res: Response): Promise<void> => {
    const article = await this.service.getPublishedBySlug(
      String(req.params.slug),
    );

    res.status(200).json({ article: presentArticle(article) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const article = await this.service.create(
      req.body as CreateArticleInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({ article: presentArticle(article) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const article = await this.service.update(
      parseIdParam(req.params.articleId),
      req.body as UpdateArticleInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ article: presentArticle(article) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.articleId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
