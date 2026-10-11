import { randomUUID } from 'node:crypto';
import { open, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
const MAX_FILENAME_BYTES = 255;
const publicDocumentDirectory = path.resolve(
  process.cwd(),
  'public',
  'document_commitment',
);

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
    const destination = this.getFilePath(filename);
    await mkdir(publicDocumentDirectory, { recursive: true });

    let fileHandle;
    try {
      fileHandle = await open(destination, 'wx');
    } catch (error) {
      if (isFileExistsError(error)) {
        throw new ApiError(
          409,
          'A document with this filename already exists.',
        );
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

  async replace(
    previousFilename: string,
    filename: string,
    buffer: Buffer,
  ): Promise<FileReplacement> {
    const destination = this.getFilePath(filename);
    await mkdir(publicDocumentDirectory, { recursive: true });

    if (previousFilename !== filename) {
      await this.store(filename, buffer);

      return {
        commitAfterTransaction: () => this.removeAfterCommit(previousFilename),
        rollbackAfterFailure: () => this.removeAfterCommit(filename),
      };
    }

    return this.replaceSameFilename(destination, buffer);
  }

  async removeAfterCommit(filename: string): Promise<void> {
    try {
      await rm(this.getFilePath(filename), { force: true });
    } catch (error) {
      console.error('Unable to remove a document file.', error);
    }
  }

  private async replaceSameFilename(
    destination: string,
    buffer: Buffer,
  ): Promise<FileReplacement> {
    const suffix = randomUUID();
    const temporaryPath = path.join(
      publicDocumentDirectory,
      `.document-commitment-${suffix}.tmp`,
    );
    const backupPath = path.join(
      publicDocumentDirectory,
      `.document-commitment-${suffix}.bak`,
    );

    await this.writeTemporaryFile(temporaryPath, buffer);

    let backupExists = false;
    try {
      try {
        await rename(destination, backupPath);
        backupExists = true;
      } catch (error) {
        if (!isFileNotFoundError(error)) throw error;
      }

      await rename(temporaryPath, destination);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      if (backupExists) {
        await rename(backupPath, destination);
      }

      throw error;
    }

    return {
      commitAfterTransaction: async () => {
        await rm(backupPath, { force: true }).catch((error: unknown) => {
          console.error('Unable to remove a replaced document file.', error);
        });
      },
      rollbackAfterFailure: async () => {
        await rm(destination, { force: true });
        if (backupExists) {
          await rename(backupPath, destination);
        }
      },
    };
  }

  private async writeTemporaryFile(
    destination: string,
    buffer: Buffer,
  ): Promise<void> {
    const fileHandle = await open(destination, 'wx');

    try {
      await fileHandle.writeFile(buffer);
    } catch (error) {
      await rm(destination, { force: true });
      throw error;
    } finally {
      await fileHandle.close();
    }
  }

  private getFilePath(filename: string): string {
    return path.join(publicDocumentDirectory, validateFilename(filename));
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

function isFileExistsError(error: unknown): boolean {
  return isFileSystemError(error, 'EEXIST');
}

function isFileNotFoundError(error: unknown): boolean {
  return isFileSystemError(error, 'ENOENT');
}

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
