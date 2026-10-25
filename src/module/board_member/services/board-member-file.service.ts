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
    const replacement = await s3FileStorage.replace(
      photoPath,
      details.buffer,
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

  const match = /^\/public\/board_member\/(\d+)\.(png|jpe?g|webp|svg)$/.exec(
    photoPath,
  );

  return match ? `${match[1]}.${match[2]}` : null;
}
