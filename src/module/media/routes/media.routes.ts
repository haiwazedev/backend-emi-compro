import { Router } from 'express';
import {
  createAuthMiddleware,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { MediaController } from '../controllers/media.controller.js';
import { uploadMediaFile } from '../middlewares/media-upload.middleware.js';
import {
  bulkDeleteMediaBodySchema,
  mediaListQuerySchema,
  updateMediaBodySchema,
  uploadMediaBodySchema,
} from '../schemas/media.schema.js';

const controller = new MediaController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const mediaRouter = Router();

mediaRouter.get(
  '/media',
  validateQuery(mediaListQuerySchema, 'mediaListQuery'),
  controller.list,
);
mediaRouter.get('/media/:mediaId', controller.get);
mediaRouter.post(
  '/media',
  requireAuth,
  requireWrite,
  uploadMediaFile,
  validateBody(uploadMediaBodySchema),
  controller.upload,
);
mediaRouter.put(
  '/media/:mediaId',
  requireAuth,
  requireWrite,
  validateBody(updateMediaBodySchema),
  controller.update,
);
mediaRouter.delete(
  '/media/:mediaId',
  requireAuth,
  requireDelete,
  controller.delete,
);
mediaRouter.post(
  '/media/bulk_delete',
  requireAuth,
  requireDelete,
  validateBody(bulkDeleteMediaBodySchema),
  controller.bulkDelete,
);
