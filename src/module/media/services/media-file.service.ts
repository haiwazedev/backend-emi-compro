import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import {
  MAX_IMAGE_UPLOAD_SIZE,
  MAX_PDF_UPLOAD_SIZE,
} from '../../../shared/files/upload-limits.js';
import {
  processImageUpload,
  type ImageMetadata,
} from '../../../shared/files/image-file.js';
import { logger } from '../../../shared/logging/logger.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';
import type { MediaType } from '../schemas/media.schema.js';

export type MediaFileDetails = {
  filename: string;
  extension: string;
  path: string;
  buffer: Buffer;
  size: number;
  metadata?: ImageMetadata;
};

export class MediaFileService {
  describeUpload(file: Express.Multer.File, type: MediaType): MediaFileDetails {
    const originalName = validateFilename(file.originalname);
    const extension = path.extname(originalName).slice(1).toLowerCase();
    // A random suffix keeps stored filenames unique and unguessable.
    const filename = `${toSlug(originalName)}-${randomBytes(8).toString('hex')}.${extension}`;
    const maxSize =
      type === 'PICTURE' ? MAX_IMAGE_UPLOAD_SIZE : MAX_PDF_UPLOAD_SIZE;
    const maxSizeLabel = type === 'PICTURE' ? '5 MiB' : '20 MiB';

    if (file.size > maxSize) {
      throw new ApiError(
        413,
        'Uploaded file must not exceed ' + maxSizeLabel + '.',
      );
    }

    if (type === 'DOCUMENT') {
      if (extension !== 'pdf' || !hasPdfSignature(file.buffer)) {
        throw new ApiError(400, 'Document must be a valid PDF file.');
      }

      return {
        filename,
        extension,
        path: buildPublicPath(filename),
        buffer: file.buffer,
        size: Math.ceil(file.size / 1024),
      };
    }

    const image = processImageUpload(file.buffer, extension, 'Picture');

    return {
      filename,
      extension,
      path: buildPublicPath(filename),
      buffer: image.buffer,
      size: Math.ceil(image.buffer.length / 1024),
      metadata: image.metadata,
    };
  }

  async store(filename: string, buffer: Buffer): Promise<void> {
    const publicPath = buildPublicPath(validateFilename(filename));
    await s3FileStorage.store(
      publicPath,
      buffer,
      contentTypeForPublicPath(publicPath),
      'A file with this filename already exists.',
    );
  }

  async remove(publicPath: string): Promise<void> {
    await s3FileStorage.remove(publicPath);
  }

  async removeAfterCommit(publicPath: string): Promise<void> {
    try {
      await this.remove(publicPath);
    } catch (error) {
      logger.error(
        {
          err: error,
          component: 'media',
          operation: 'remove_after_commit',
          resourceType: 'media_file',
        },
        'Unable to remove a media file.',
      );
    }
  }
}

function validateFilename(filename: string): string {
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0') ||
    path.basename(filename) !== filename ||
    filename.length > 255
  ) {
    throw new ApiError(
      400,
      'Filename must be a safe file name of at most 255 characters.',
    );
  }

  const publicPath = buildPublicPath(filename);
  if ([...publicPath].length > 255) {
    throw new ApiError(400, 'Filename is too long for the public media path.');
  }

  return filename;
}

function toSlug(filename: string): string {
  const slug = path
    .parse(filename)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

  return slug || 'file';
}

function buildPublicPath(filename: string): string {
  return '/public/media/' + encodeURIComponent(filename);
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-';
}
