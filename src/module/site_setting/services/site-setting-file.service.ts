import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { getPictureDimensions } from '../../../shared/files/picture-file.js';
import { sanitizeSvg } from '../../../shared/files/svg-file.js';
import { logger } from '../../../shared/logging/logger.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const MAX_ICON_SIZE = 1 * 1024 * 1024;

type FileRule = {
  publicPath: string;
  filenamePrefix: string;
  extensions: string[];
  maxSize: number;
  label: string;
};

export const LOGO_FILE_RULE: FileRule = {
  publicPath: '/public/',
  filenamePrefix: 'site-logo-',
  extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
  maxSize: MAX_LOGO_SIZE,
  label: 'Logo',
};

export const ICON_FILE_RULE: FileRule = {
  publicPath: '/public/site-social-medias/',
  filenamePrefix: 'site-social-media-',
  extensions: ['svg'],
  maxSize: MAX_ICON_SIZE,
  label: 'Social media icon',
};

export type StoredFile = {
  filename: string;
  filepath: string;
  extension: string;
  size: number;
  metadata: { width: number; height: number } | Record<string, never>;
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
    if (!rule.extensions.includes(extension)) {
      throw new ApiError(
        400,
        `${rule.label} must be a ${rule.extensions.join(', ').toUpperCase()} file.`,
      );
    }

    const isSvg = extension === 'svg';
    const buffer = isSvg ? sanitizeSvg(file.buffer) : file.buffer;
    const metadata = isSvg ? {} : getPictureDimensions(buffer, extension);
    const filename = `${rule.filenamePrefix}${toSlug(file.originalname)}-${randomBytes(8).toString('hex')}.${extension}`;

    const filepath = rule.publicPath + filename;
    await s3FileStorage.store(
      filepath,
      buffer,
      contentTypeForPublicPath(filepath),
      'A file with this filename already exists.',
    );

    return {
      filename,
      filepath,
      extension,
      size: Math.ceil(buffer.length / 1024),
      metadata,
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
      logger.error({ err: error }, 'Unable to remove a site settings file.');
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
