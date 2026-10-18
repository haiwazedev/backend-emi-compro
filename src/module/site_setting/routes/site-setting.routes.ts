import { Router } from 'express';
import {
  createAuthMiddleware,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { SiteSettingController } from '../controllers/site-setting.controller.js';
import {
  parseSiteSettingData,
  uploadSiteSettingFiles,
} from '../middlewares/site-setting-upload.middleware.js';
import {
  saveSiteSettingBodySchema,
  siteSettingQuerySchema,
} from '../schemas/site-setting.schema.js';

const controller = new SiteSettingController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const siteSettingRouter = Router();

siteSettingRouter.get(
  '/site_settings',
  validateQuery(siteSettingQuerySchema, 'siteSettingQuery'),
  controller.get,
);
siteSettingRouter.put(
  '/site_settings',
  requireAuth,
  requireWrite,
  uploadSiteSettingFiles,
  parseSiteSettingData,
  validateBody(saveSiteSettingBodySchema),
  controller.save,
);
