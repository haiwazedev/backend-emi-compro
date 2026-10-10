import { open, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import type { MediaType } from '../schemas/media.schema.js';

const MAX_PICTURE_SIZE = 2 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const publicMediaDirectory = path.resolve(process.cwd(), 'public', 'media');

export type MediaFileDetails = {
  filename: string;
  extension: string;
  path: string;
  size: number;
  metadata?: { width: number; height: number };
};

export class MediaFileService {
  describeUpload(file: Express.Multer.File, type: MediaType): MediaFileDetails {
    const filename = validateFilename(file.originalname);
    const extension = path.extname(filename).slice(1).toLowerCase();
    const maxSize = type === 'PICTURE' ? MAX_PICTURE_SIZE : MAX_DOCUMENT_SIZE;
    const maxSizeLabel = type === 'PICTURE' ? '2 MiB' : '5 MiB';

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
        size: Math.ceil(file.size / 1024),
      };
    }

    if (!['png', 'jpg', 'jpeg'].includes(extension)) {
      throw new ApiError(400, 'Picture must be a PNG, JPG, or JPEG file.');
    }

    const dimensions = getPictureDimensions(file.buffer, extension);

    return {
      filename,
      extension,
      path: buildPublicPath(filename),
      size: Math.ceil(file.size / 1024),
      metadata: dimensions,
    };
  }

  async store(filename: string, buffer: Buffer): Promise<void> {
    const destination = getFilePath(filename);
    await mkdir(publicMediaDirectory, { recursive: true });

    let fileHandle;
    try {
      fileHandle = await open(destination, 'wx');
    } catch (error) {
      if (isFileExistsError(error)) {
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

  async remove(filename: string): Promise<void> {
    await rm(getFilePath(filename), { force: true });
  }

  async removeAfterCommit(filename: string): Promise<void> {
    try {
      await this.remove(filename);
    } catch (error) {
      console.error('Unable to remove a media file.', error);
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

function buildPublicPath(filename: string): string {
  return '/public/media/' + encodeURIComponent(filename);
}

function getFilePath(filename: string): string {
  const safeFilename = validateFilename(filename);
  return path.join(publicMediaDirectory, safeFilename);
}

function getPictureDimensions(
  buffer: Buffer,
  extension: string,
): { width: number; height: number } {
  if (extension === 'png') {
    if (
      buffer.length < 24 ||
      !buffer
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ) ||
      buffer.toString('ascii', 12, 16) !== 'IHDR'
    ) {
      throw new ApiError(
        400,
        'Picture content does not match its file extension.',
      );
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width === 0 || height === 0) {
      throw new ApiError(400, 'Picture dimensions are invalid.');
    }

    return { width, height };
  }

  return readJpegDimensions(buffer);
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } {
  if (
    buffer.length < 4 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer[2] !== 0xff
  ) {
    throw new ApiError(
      400,
      'Picture content does not match its file extension.',
    );
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw new ApiError(400, 'Picture content is not a valid JPEG file.');
    }

    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) break;

      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width === 0 || height === 0) {
        throw new ApiError(400, 'Picture dimensions are invalid.');
      }

      return { width, height };
    }

    offset += segmentLength;
  }

  throw new ApiError(400, 'Picture content does not contain valid dimensions.');
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-';
}

function isFileExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}
