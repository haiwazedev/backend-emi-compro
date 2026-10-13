import { randomUUID } from 'node:crypto';
import { open, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { getPictureDimensions } from '../../../shared/files/picture-file.js';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const publicBoardMemberDirectory = path.resolve(
  process.cwd(),
  'public',
  'board_member',
);

export type BoardMemberPhotoDetails = {
  extension: string;
};

export type BoardMemberPhotoReplacement = {
  photoPath: string;
  commitAfterTransaction(): Promise<void>;
  rollbackAfterFailure(): Promise<void>;
};

export class BoardMemberFileService {
  describeUpload(file: Express.Multer.File): BoardMemberPhotoDetails {
    if (file.size > MAX_PHOTO_SIZE) {
      throw new ApiError(413, 'Uploaded photo must not exceed 5 MiB.');
    }

    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(extension)) {
      throw new ApiError(400, 'Photo must be a PNG, JPG, or JPEG file.');
    }

    getPictureDimensions(file.buffer, extension);

    return { extension };
  }

  async replace(
    memberId: number,
    previousPhotoPath: string | null,
    details: BoardMemberPhotoDetails,
    buffer: Buffer,
  ): Promise<BoardMemberPhotoReplacement> {
    const photoPath = buildPublicPath(memberId, details.extension);
    const destination = getFilePath(memberId, details.extension);
    const suffix = randomUUID();
    const temporaryPath = path.join(
      publicBoardMemberDirectory,
      `.board-member-${suffix}.tmp`,
    );
    const backupPath = path.join(
      publicBoardMemberDirectory,
      `.board-member-${suffix}.bak`,
    );

    await mkdir(publicBoardMemberDirectory, { recursive: true });
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
      if (backupExists) await rename(backupPath, destination);
      throw error;
    }

    return {
      photoPath,
      commitAfterTransaction: async () => {
        if (backupExists) {
          await rm(backupPath, { force: true }).catch((error: unknown) => {
            console.error(
              'Unable to remove a replaced board member photo.',
              error,
            );
          });
        }

        if (previousPhotoPath !== photoPath) {
          await this.removeAfterCommit(previousPhotoPath);
        }
      },
      rollbackAfterFailure: async () => {
        await rm(destination, { force: true });
        if (backupExists) await rename(backupPath, destination);
      },
    };
  }

  async removeAfterCommit(photoPath: string | null): Promise<void> {
    const filename = getPhotoFilename(photoPath);
    if (!filename) return;

    try {
      await rm(path.join(publicBoardMemberDirectory, filename), {
        force: true,
      });
    } catch (error) {
      console.error('Unable to remove a board member photo.', error);
    }
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
}

function buildPublicPath(memberId: number, extension: string): string {
  return `/public/board_member/${memberId}.${extension}`;
}

function getFilePath(memberId: number, extension: string): string {
  return path.join(publicBoardMemberDirectory, `${memberId}.${extension}`);
}

function getPhotoFilename(photoPath: string | null): string | null {
  if (!photoPath) return null;

  const match = /^\/public\/board_member\/(\d+)\.(png|jpg|jpeg)$/.exec(
    photoPath,
  );

  return match ? `${match[1]}.${match[2]}` : null;
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
