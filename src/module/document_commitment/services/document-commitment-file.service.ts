import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { MAX_PDF_UPLOAD_SIZE } from '../../../shared/files/upload-limits.js';
import { logger } from '../../../shared/logging/logger.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';

const MAX_FILENAME_BYTES = 255;
export type DocumentCommitmentFileDetails = {
  filename: string;
  filePath: string;
  size: number;
};

export type FileReplacement = {
  commitAfterTransaction(): Promise<void>;
  rollbackAfterFailure(): Promise<void>;
};

export class DocumentCommitmentFileService {
  describeUpload(file: Express.Multer.File): DocumentCommitmentFileDetails {
    const originalName = validateFilename(file.originalname);

    if (file.size > MAX_PDF_UPLOAD_SIZE) {
      throw new ApiError(413, 'Uploaded file must not exceed 20 MiB.');
    }

    if (
      path.extname(originalName).toLowerCase() !== '.pdf' ||
      !hasPdfSignature(file.buffer)
    ) {
      throw new ApiError(400, 'Document must be a valid PDF file.');
    }

    // A random suffix keeps stored filenames unique and unguessable.
    const filename = `${toSlug(originalName)}-${randomBytes(8).toString('hex')}.pdf`;

    return {
      filename,
      filePath: buildPublicPath(filename),
      size: Math.ceil(file.size / 1024),
    };
  }

  async store(filename: string, buffer: Buffer): Promise<void> {
    const publicPath = buildPublicPath(validateFilename(filename));
    await s3FileStorage.store(
      publicPath,
      buffer,
      contentTypeForPublicPath(publicPath),
      'A document with this filename already exists.',
    );
  }

  async replace(
    previousFilename: string,
    filename: string,
    buffer: Buffer,
  ): Promise<FileReplacement> {
    if (previousFilename !== filename) {
      await this.store(filename, buffer);

      return {
        commitAfterTransaction: () => this.removeAfterCommit(previousFilename),
        rollbackAfterFailure: () => this.removeAfterCommit(filename),
      };
    }

    const publicPath = buildPublicPath(validateFilename(filename));
    return s3FileStorage.replace(
      publicPath,
      buffer,
      contentTypeForPublicPath(publicPath),
    );
  }

  async removeAfterCommit(filename: string): Promise<void> {
    try {
      await s3FileStorage.remove(buildPublicPath(validateFilename(filename)));
    } catch (error) {
      logger.error(
        {
          err: error,
          component: 'document_commitment',
          operation: 'remove_after_commit',
          resourceType: 'document_commitment_file',
        },
        'Unable to remove a document file.',
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
    Buffer.byteLength(filename, 'utf8') > MAX_FILENAME_BYTES
  ) {
    throw new ApiError(
      400,
      'Filename must be a safe name of at most 255 bytes.',
    );
  }

  if ([...buildPublicPath(filename)].length > 255) {
    throw new ApiError(400, 'Filename is too long for the public file path.');
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

  return slug || 'document';
}

function buildPublicPath(filename: string): string {
  return `/public/document_commitment/${encodeURIComponent(filename)}`;
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-';
}
