import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';
import { getPictureDimensions } from '../../../shared/files/picture-file.js';
import { logger } from '../../../shared/logging/logger.js';
import {
  contentTypeForPublicPath,
  s3FileStorage,
} from '../../../shared/storage/s3-file-storage.js';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
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
    const replacement = await s3FileStorage.replace(
      photoPath,
      buffer,
      contentTypeForPublicPath(photoPath),
    );

    return {
      photoPath,
      commitAfterTransaction: async () => {
        await replacement.commitAfterTransaction();
        if (previousPhotoPath !== photoPath) {
          await this.removeAfterCommit(previousPhotoPath);
        }
      },
      rollbackAfterFailure: () => replacement.rollbackAfterFailure(),
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

function buildPublicPath(memberId: number, extension: string): string {
  return `/public/board_member/${memberId}.${extension}`;
}

function getPhotoFilename(photoPath: string | null): string | null {
  if (!photoPath) return null;

  const match = /^\/public\/board_member\/(\d+)\.(png|jpg|jpeg)$/.exec(
    photoPath,
  );

  return match ? `${match[1]}.${match[2]}` : null;
}
