import { mkdir, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { getPictureDimensions } from '../../../shared/files/picture-file.js';
import { sanitizeSvg } from '../../../shared/files/svg-file.js';

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const MAX_ICON_SIZE = 1 * 1024 * 1024;

type FileRule = {
  directory: string;
  publicPath: string;
  filenamePrefix: string;
  extensions: string[];
  maxSize: number;
  label: string;
};

export const LOGO_FILE_RULE: FileRule = {
  directory: path.resolve(process.cwd(), 'public'),
  publicPath: '/public/',
  filenamePrefix: 'site-logo-',
  extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
  maxSize: MAX_LOGO_SIZE,
  label: 'Logo',
};

export const ICON_FILE_RULE: FileRule = {
  directory: path.resolve(process.cwd(), 'public', 'site-social-medias'),
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
    const filename = `${rule.filenamePrefix}${toSlug(file.originalname)}-${Date.now()}.${extension}`;

    await mkdir(rule.directory, { recursive: true });
    await writeNewFile(path.join(rule.directory, filename), buffer);

    return {
      filename,
      filepath: rule.publicPath + filename,
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
      await rm(path.join(rule.directory, filename), { force: true });
    } catch (error) {
      console.error('Unable to remove a site settings file.', error);
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

async function writeNewFile(destination: string, buffer: Buffer) {
  let fileHandle;
  try {
    fileHandle = await open(destination, 'wx');
  } catch (error) {
    if (isErrorCode(error, 'EEXIST')) {
      throw new ApiError(409, 'A file with this filename already exists.');
    }

    throw error;
  }

  try {
    await fileHandle.writeFile(buffer);
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  } finally {
    await fileHandle.close();
  }
}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
