import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../../../shared/errors/api-error.js';

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const allowedMimeTypesByExtension: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = allowedMimeTypesByExtension[extension];

    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
      callback(
        new ApiError(
          400,
          'Primary photo must be a PNG, JPG, JPEG, or WebP image.',
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadArticlePhoto = upload.single('primary_photo');
