import type { Request, Response } from 'express';
import { hasPermission } from '../../auth/auth.middleware.js';
import { presentSearchResult } from '../presenters/search.presenter.js';
import type { SearchQuery } from '../schemas/search.schema.js';
import { SearchService } from '../services/search.service.js';

export class SearchController {
  constructor(private readonly service = new SearchService()) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const { q } = res.locals.searchQuery as SearchQuery;
    const result = await this.service.search(
      q,
      hasPermission(req, 'manage_users'),
    );

    res.status(200).json(presentSearchResult(result));
  };
}
