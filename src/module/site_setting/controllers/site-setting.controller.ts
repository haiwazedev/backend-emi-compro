import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { presentSiteSetting } from '../presenters/site-setting.presenter.js';
import type {
  SaveSiteSettingInput,
  SiteSettingQuery,
} from '../schemas/site-setting.schema.js';
import {
  SiteSettingService,
  type SiteSettingFiles,
} from '../services/site-setting.service.js';

export class SiteSettingController {
  constructor(private readonly service = new SiteSettingService()) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.siteSettingQuery as SiteSettingQuery;
    // Signed-in CMS users also see DRAFT social media; the public sees PUBLISHED only.
    const result = await this.service.get(
      query.language_id,
      Boolean(req.session.userId),
    );

    res.status(200).json({ site_settings: presentSiteSetting(result) });
  };

  save = async (req: Request, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw new ApiError(401, 'Authentication is required.');
    }

    const result = await this.service.save(
      req.body as SaveSiteSettingInput,
      (req.files ?? {}) as SiteSettingFiles,
      req.authenticatedUser.name,
    );

    res.status(200).json({ site_settings: presentSiteSetting(result) });
  };
}
