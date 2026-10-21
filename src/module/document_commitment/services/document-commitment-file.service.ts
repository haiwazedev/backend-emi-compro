import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
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
    const filename = validateFilename(file.originalname);

    if (file.size > MAX_DOCUMENT_SIZE) {
      throw new ApiError(413, 'Uploaded file must not exceed 50 MiB.');
    }

    if (
      path.extname(filename).toLowerCase() !== '.pdf' ||
      !hasPdfSignature(file.buffer)
    ) {
      throw new ApiError(400, 'Document must be a valid PDF file.');
    }

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
      console.error('Unable to remove a document file.', error);
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

function buildPublicPath(filename: string): string {
  return `/public/document_commitment/${encodeURIComponent(filename)}`;
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-';
}
