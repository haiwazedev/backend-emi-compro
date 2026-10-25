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

type FileRule = {
  publicPath: string;
  filenamePrefix: string;
  maxSize: number;
  label: string;
};

export const LOGO_FILE_RULE: FileRule = {
  publicPath: '/public/',
  filenamePrefix: 'site-logo-',
  maxSize: MAX_IMAGE_UPLOAD_SIZE,
  label: 'Logo',
};

export const ICON_FILE_RULE: FileRule = {
  publicPath: '/public/site-social-medias/',
  filenamePrefix: 'site-social-media-',
  maxSize: MAX_IMAGE_UPLOAD_SIZE,
  label: 'Social media icon',
};

export type StoredFile = {
  filename: string;
  filepath: string;
  extension: string;
  size: number;
  metadata: ImageMetadata;
};

export class SiteSettingFileService {
  async store(rule: FileRule, file: Express.Multer.File): Promise<StoredFile> {
    if (file.size > rule.maxSize) {
      throw new ApiError(
        413,
        `${rule.label} must not exceed ${rule.maxSize / 1024 / 1024} MiB.`,
      );
    }

    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    const image = processImageUpload(file.buffer, extension, rule.label);
    const filename = `${rule.filenamePrefix}${toSlug(file.originalname)}-${randomBytes(8).toString('hex')}.${extension}`;

    const filepath = rule.publicPath + filename;
    await s3FileStorage.store(
      filepath,
      image.buffer,
      contentTypeForPublicPath(filepath),
      'A file with this filename already exists.',
    );

    return {
      filename,
      filepath,
      extension,
      size: Math.ceil(image.buffer.length / 1024),
      metadata: image.metadata,
    };
  }

  async remove(rule: FileRule, filepath: string | null): Promise<void> {
    if (!filepath?.startsWith(rule.publicPath)) return;

    // Only files this service stored are removed; anything else is left alone.
    const filename = path.basename(filepath);
    if (!filename.startsWith(rule.filenamePrefix)) return;

    try {
      await s3FileStorage.remove(filepath);
    } catch (error) {
      logger.error(
        {
          err: error,
          component: 'site_setting',
          operation: 'remove_file_after_commit',
          resourceType: 'site_setting_file',
        },
        'Unable to remove a site settings file.',
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

  return slug || 'file';
}
