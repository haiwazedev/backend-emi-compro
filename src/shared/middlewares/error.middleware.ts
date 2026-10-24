import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../errors/api-error.js';
import type { RequestErrorLogContext } from './request-logging.middleware.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof ApiError) {
    setRequestErrorContext(res, {
      errorType: error.name,
      errorMessage: error.message,
      ...(error.validationPath && { validationPath: error.validationPath }),
      ...(error.statusCode >= 500 && { err: error }),
    });
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    const message = isFileTooLarge
      ? 'Uploaded file exceeds the maximum upload size.'
      : 'Invalid multipart form data.';

    setRequestErrorContext(res, {
      errorType: error.name,
      errorCode: error.code,
      errorMessage: message,
    });
    res.status(isFileTooLarge ? 413 : 400).json({
      message,
    });
    return;
  }

  if (isInvalidJsonError(error)) {
    const message = 'Request body must contain valid JSON.';
    setRequestErrorContext(res, {
      errorType: 'InvalidJsonError',
      errorMessage: message,
    });
    res.status(400).json({ message });
    return;
  }

  setRequestErrorContext(res, {
    errorType: getErrorType(error),
    errorMessage: getErrorMessage(error),
    err: error,
  });
  res.status(500).json({ message: 'Internal server error.' });
};

function setRequestErrorContext(
  response: Parameters<ErrorRequestHandler>[2],
  context: RequestErrorLogContext,
): void {
  response.locals.requestErrorContext = context;
}

function getErrorType(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unknown request error occurred.';
}

function isInvalidJsonError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}
