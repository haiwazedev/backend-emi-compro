import multer from 'multer';
import { MAX_IMAGE_UPLOAD_SIZE } from '../../../shared/files/upload-limits.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_SIZE,
    files: 1,
    fields: 7,
    fieldSize: 1024,
  },
});

export const uploadBoardMemberPhoto = upload.single('photo');
