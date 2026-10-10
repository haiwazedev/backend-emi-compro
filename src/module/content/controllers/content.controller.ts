import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ContentService } from '../services/content.service.js';
import { presentContent } from '../presenters/content.presenter.js';
import type {
  ContentListQuery,
  UpsertContentInput,
} from '../schemas/content.schema.js';

export class ContentController {
  constructor(private readonly service = new ContentService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.contentListQuery as ContentListQuery;
    const contents = await this.service.list(query);

    res.status(200).json({ contents: contents.map(presentContent) });
  };

  upsert = async (req: Request, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw new ApiError(401, 'Authentication is required.');
    }

    const contents = await this.service.upsertMany(
      req.body as UpsertContentInput[],
      req.authenticatedUser.name,
    );

    res.status(200).json({ contents: contents.map(presentContent) });
  };
}
