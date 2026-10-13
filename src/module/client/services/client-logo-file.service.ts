import { mkdir, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { getPictureDimensions } from '../../../shared/files/picture-file.js';

export const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const publicClientDirectory = path.resolve(process.cwd(), 'public', 'clients');
const publicClientPath = '/public/clients/';

export type ClientLogo = {
  filename: string;
  filepath: string;
  extension: string;
  size: number;
  metadata: { width: number; height: number };
};

export class ClientLogoFileService {
  async store(originalName: string, buffer: Buffer): Promise<ClientLogo> {
    if (buffer.length > MAX_LOGO_SIZE) {
      throw new ApiError(413, 'Uploaded logo must not exceed 5 MiB.');
    }

    const extension = path.extname(originalName).slice(1).toLowerCase();
    if (!LOGO_EXTENSIONS.includes(extension)) {
      throw new ApiError(400, 'Logo must be a PNG, JPG, JPEG, or WEBP file.');
    }

    const metadata = getPictureDimensions(buffer, extension);
    const filename = `${toSlug(originalName)}-${Date.now()}.${extension}`;

    await mkdir(publicClientDirectory, { recursive: true });
    await writeNewFile(path.join(publicClientDirectory, filename), buffer);

    return {
      filename,
      filepath: publicClientPath + filename,
      extension,
      size: Math.ceil(buffer.length / 1024),
      metadata,
    };
  }

  async removeAfterCommit(filepath: string): Promise<void> {
    // Only files this service stored are removed; anything else is left alone.
    if (!filepath.startsWith(publicClientPath)) return;

    const filename = path.basename(filepath);
    try {
      await rm(path.join(publicClientDirectory, filename), { force: true });
    } catch (error) {
      console.error('Unable to remove a client logo.', error);
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

async function writeNewFile(destination: string, buffer: Buffer) {
  let fileHandle;
  try {
    fileHandle = await open(destination, 'wx');
  } catch (error) {
    if (isErrorCode(error, 'EEXIST')) {
      throw new ApiError(409, 'A logo with this filename already exists.');
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
