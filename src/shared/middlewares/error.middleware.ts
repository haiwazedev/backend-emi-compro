import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../errors/api-error.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(isFileTooLarge ? 413 : 400).json({
      message: isFileTooLarge
        ? 'Uploaded file exceeds the maximum upload size.'
        : 'Invalid multipart form data.',
    });
    return;
  }

  if (isInvalidJsonError(error)) {
    res.status(400).json({ message: 'Request body must contain valid JSON.' });
    return;
  }

  res.status(500).json({ message: 'Internal server error.' });
};

function isInvalidJsonError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}
