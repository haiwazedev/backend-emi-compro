import type { RequestHandler } from 'express';
import { Readable } from 'node:stream';
import { ApiError } from '../errors/api-error.js';
import {
  contentTypeForPublicPath,
  objectKeyToPublicPath,
  publicPathToObjectKey,
  S3ObjectNotFoundError,
  s3FileStorage,
} from '../storage/s3-file-storage.js';

const svgContentSecurityPolicy =
  "default-src 'none'; style-src 'unsafe-inline'; sandbox";

export const publicFileMiddleware: RequestHandler = async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const rawPath = req.originalUrl.split('?')[0];
  let publicPath: string;

  try {
    publicPath = objectKeyToPublicPath(publicPathToObjectKey(rawPath)) ?? '';
  } catch {
    res.status(404).end();
    return;
  }

  await sendStoredFile(req, res, next, publicPath);
};

export async function sendStoredFile(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
  publicPath: string,
): Promise<void> {
  try {
    if (req.method === 'HEAD') {
      const result = await s3FileStorage.head(publicPath);
      setFileHeaders(res, publicPath, result);
      res.status(200).end();
      return;
    }

    const result = await s3FileStorage.get(publicPath, req.get('range'));
    setFileHeaders(res, publicPath, result);
    if (result.ContentRange) res.status(206);

    if (!result.Body) {
      res.end();
      return;
    }

    const stream = result.Body as Readable;
    stream.on('error', (error: Error) => {
      if (res.headersSent) {
        res.destroy(error);
      } else {
        next(new ApiError(503, 'File storage is unavailable.'));
      }
    });
    stream.pipe(res);
  } catch (error) {
    if (error instanceof S3ObjectNotFoundError) {
      res.status(404).end();
      return;
    }

    next(error);
  }
}

function setFileHeaders(
  res: Parameters<RequestHandler>[1],
  publicPath: string,
  result: {
    ContentLength?: number;
    ContentRange?: string;
    ETag?: string;
    LastModified?: Date;
  },
): void {
  res.setHeader('Content-Type', contentTypeForPublicPath(publicPath));
  res.setHeader('Accept-Ranges', 'bytes');

  if (result.ContentLength !== undefined) {
    res.setHeader('Content-Length', result.ContentLength);
  }
  if (result.ContentRange) res.setHeader('Content-Range', result.ContentRange);
  if (result.ETag) res.setHeader('ETag', result.ETag);
  if (result.LastModified) {
    res.setHeader('Last-Modified', result.LastModified.toUTCString());
  }

  if (publicPath.toLowerCase().endsWith('.svg')) {
    res.setHeader('Content-Security-Policy', svgContentSecurityPolicy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}
