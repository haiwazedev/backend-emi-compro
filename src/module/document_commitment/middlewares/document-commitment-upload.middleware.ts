import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
    fields: 3,
    fieldSize: 1024,
  },
});

export const uploadDocumentCommitmentFile = upload.single('file');
