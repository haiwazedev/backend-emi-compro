import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { processImageUpload } from '../../../shared/files/image-file.js';
import { MAX_IMAGE_UPLOAD_SIZE } from '../../../shared/files/upload-limits.js';
import { logger } from '../../../shared/logging/logger.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';

export type BoardMemberPhotoDetails = {
  extension: string;
  buffer: Buffer;
};

export type BoardMemberPhotoReplacement = {
  photoPath: string;
  commitAfterTransaction(): Promise<void>;
  rollbackAfterFailure(): Promise<void>;
};

export class BoardMemberFileService {
  describeUpload(file: Express.Multer.File): BoardMemberPhotoDetails {
    if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
      throw new ApiError(413, 'Uploaded photo must not exceed 5 MiB.');
    }

    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    const image = processImageUpload(file.buffer, extension, 'Photo');

    return { extension, buffer: image.buffer };
  }

  async replace(
    memberId: number,
    previousPhotoPath: string | null,
    details: BoardMemberPhotoDetails,
  ): Promise<BoardMemberPhotoReplacement> {
    const photoPath = buildPublicPath(memberId, details.extension);
    await s3FileStorage.store(
      photoPath,
      details.buffer,
      contentTypeForPublicPath(photoPath),
      'A photo with this filename already exists.',
    );

    return {
      photoPath,
      commitAfterTransaction: () => this.removeAfterCommit(previousPhotoPath),
      rollbackAfterFailure: () => this.removeAfterCommit(photoPath),
    };
  }

  async removeAfterCommit(photoPath: string | null): Promise<void> {
    const filename = getPhotoFilename(photoPath);
    if (!filename) return;

    try {
      await s3FileStorage.remove(`/public/board_member/${filename}`);
    } catch (error) {
      logger.error(
        {
          err: error,
          component: 'board_member',
          operation: 'remove_photo_after_commit',
          resourceType: 'board_member_photo',
        },
        'Unable to remove a board member photo.',
      );
    }
  }
}

// A random suffix gives every upload a new URL, so clients never see a cached photo.
function buildPublicPath(memberId: number, extension: string): string {
  const uniqueId = randomBytes(8).toString('hex');
  return `/public/board_member/${memberId}-${uniqueId}.${extension}`;
}

// Matches new `{id}-{uniqueId}.{ext}` names and legacy `{id}.{ext}` names.
function getPhotoFilename(photoPath: string | null): string | null {
  if (!photoPath) return null;

  const match =
    /^\/public\/board_member\/(\d+(?:-[a-f0-9]{16})?\.(?:png|jpe?g|webp|svg))$/.exec(
      photoPath,
    );

  return match ? match[1] : null;
}
