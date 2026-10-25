import multer from 'multer';
import { MAX_PDF_UPLOAD_SIZE } from '../../../shared/files/upload-limits.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_UPLOAD_SIZE,
    files: 1,
    fields: 3,
    fieldSize: 1024,
  },
});

export const uploadMediaFile = upload.single('file');
