import type { RequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../../../shared/errors/api-error.js';
import { MAX_SOCIAL_MEDIAS } from '../schemas/site-setting.schema.js';
import { MAX_LOGO_SIZE } from '../services/site-setting-file.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_LOGO_SIZE,
    files: MAX_SOCIAL_MEDIAS + 2,
    fields: 1,
    fieldSize: 64 * 1024,
  },
});

export const uploadSiteSettingFiles = upload.fields([
  { name: 'danantara_logo', maxCount: 1 },
  { name: 'pln_logo', maxCount: 1 },
  { name: 'social_icons', maxCount: MAX_SOCIAL_MEDIAS },
]);

// Multipart bodies carry the JSON payload in a single "data" field.
export const parseSiteSettingData: RequestHandler = (req, _res, next) => {
  const data: unknown = req.body?.data;

  if (typeof data !== 'string') {
    next(new ApiError(400, 'data must be a JSON string.'));
    return;
  }

  try {
    req.body = JSON.parse(data);
  } catch {
    next(new ApiError(400, 'data must contain valid JSON.'));
    return;
  }

  next();
};
