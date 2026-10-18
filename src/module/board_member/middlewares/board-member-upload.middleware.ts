import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 7,
    fieldSize: 1024,
  },
});

export const uploadBoardMemberPhoto = upload.single('photo');
