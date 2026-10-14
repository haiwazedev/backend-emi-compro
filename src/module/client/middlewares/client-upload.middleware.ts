import multer from 'multer';
import { MAX_LOGO_SIZE } from '../services/client-logo-file.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_LOGO_SIZE,
    files: 1,
    fields: 1,
    fieldSize: 1024,
  },
});

export const uploadClientLogo = upload.single('logo');
