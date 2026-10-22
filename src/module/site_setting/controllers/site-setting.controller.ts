import type { Request, Response } from 'express';
import { canSeeDrafts } from '../../auth/auth.middleware.js';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
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

  get = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.siteSettingQuery as SiteSettingQuery;
    const result = await this.service.get(query.language_id, canSeeDrafts(res));

    res.status(200).json({ site_settings: presentSiteSetting(result) });
  };

  save = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.save(
      req.body as SaveSiteSettingInput,
      (req.files ?? {}) as SiteSettingFiles,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ site_settings: presentSiteSetting(result) });
  };
}
