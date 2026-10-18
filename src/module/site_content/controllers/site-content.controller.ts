import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { presentSiteContents } from '../presenters/site-content.presenter.js';
import type {
  SaveSiteContentsInput,
  SiteContentQuery,
} from '../schemas/site-content.schema.js';
import { SiteContentService } from '../services/site-content.service.js';

export class SiteContentController {
  constructor(private readonly service = new SiteContentService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.siteContentQuery as SiteContentQuery;
    const result = await this.service.list(query);

    res.status(200).json({ site_contents: presentSiteContents(result) });
  };

  save = async (req: Request, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw new ApiError(401, 'Authentication is required.');
    }

    const result = await this.service.save(
      req.body as SaveSiteContentsInput,
      req.authenticatedUser.name,
    );

    res.status(200).json({ site_contents: presentSiteContents(result) });
  };
}
