import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import {
  processImageUpload,
  type ImageMetadata,
} from '../../../shared/files/image-file.js';
import { MAX_IMAGE_UPLOAD_SIZE } from '../../../shared/files/upload-limits.js';
import { logger } from '../../../shared/logging/logger.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';

const publicClientPath = '/public/clients/';

export type ClientLogo = {
  filename: string;
  filepath: string;
  extension: string;
  size: number;
  metadata: ImageMetadata;
};

export class ClientLogoFileService {
  async store(originalName: string, buffer: Buffer): Promise<ClientLogo> {
    if (buffer.length > MAX_IMAGE_UPLOAD_SIZE) {
      throw new ApiError(413, 'Uploaded logo must not exceed 5 MiB.');
    }

    const extension = path.extname(originalName).slice(1).toLowerCase();
    const image = processImageUpload(buffer, extension, 'Logo');
    const filename = `${toSlug(originalName)}-${randomBytes(8).toString('hex')}.${extension}`;

    const filepath = publicClientPath + filename;
    await s3FileStorage.store(
      filepath,
      image.buffer,
      contentTypeForPublicPath(filepath),
      'A logo with this filename already exists.',
    );

    return {
      filename,
      filepath,
      extension,
      size: Math.ceil(image.buffer.length / 1024),
      metadata: image.metadata,
    };
  }

  async removeAfterCommit(filepath: string): Promise<void> {
    // Only files this service stored are removed; anything else is left alone.
    if (!filepath.startsWith(publicClientPath)) return;

    try {
      await s3FileStorage.remove(filepath);
    } catch (error) {
      logger.error(
        {
          err: error,
          component: 'client',
          operation: 'remove_logo_after_commit',
          resourceType: 'client_logo',
        },
        'Unable to remove a client logo.',
      );
    }
  }
}

function toSlug(originalName: string): string {
  const slug = path
    .parse(originalName)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

  return slug || 'logo';
}
