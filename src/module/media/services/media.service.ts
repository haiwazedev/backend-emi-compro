import { prisma } from '../../../shared/db/prisma.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { MediaRepository } from '../repositories/media.repository.js';
import type {
  MediaListQuery,
  UpdateMediaInput,
  UploadMediaInput,
} from '../schemas/media.schema.js';
import { MediaFileService } from './media-file.service.js';

export class MediaService {
  constructor(
    private readonly repository = new MediaRepository(),
    private readonly fileService = new MediaFileService(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  list(query: MediaListQuery) {
    return this.repository.findMany(query);
  }

  async getById(id: number) {
    const media = await this.repository.findById(id);

    if (!media) {
      throw new ApiError(404, 'Media was not found.');
    }

    return media;
  }

  async upload(
    file: Express.Multer.File | undefined,
    input: UploadMediaInput,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new ApiError(400, 'File is required.');
    }

    if (user.name.length > 100) {
      throw new ApiError(
        400,
        'Authenticated user name exceeds 100 characters.',
      );
    }

    const details = this.fileService.describeUpload(file, input.type);
    let fileStored = false;

    try {
      const media = await prisma.$transaction(async (transaction) => {
        const created = await this.repository.create(
          {
            filename: input.filename ?? file.originalname,
            alt: input.alt,
            path: details.path,
            extension: details.extension,
            type: input.type,
            size: details.size,
            metadata: details.metadata,
            createdBy: user.name,
          },
          transaction,
        );

        await this.fileService.store(details.filename, details.buffer);
        fileStored = true;
        return created;
      });

      await this.activityLogService.log(
        user,
        'CREATE',
        'MEDIA',
        media.filename,
      );
      return media;
    } catch (error) {
      if (fileStored) {
        await this.fileService.removeAfterCommit(details.path);
      }

      throw error;
    }
  }

  async update(id: number, input: UpdateMediaInput, user: AuthenticatedUser) {
    try {
      const media = await this.repository.update(id, input);
      await this.activityLogService.log(
        user,
        'UPDATE',
        'MEDIA',
        media.filename,
      );
      return media;
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Media was not found.');
      }

      throw error;
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const media = await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Media was not found.');
      }

      throw error;
    }

    await this.fileService.removeAfterCommit(media.path);
    await this.activityLogService.log(user, 'DELETE', 'MEDIA', media.filename);
  }

  async bulkDelete(ids: number[], user: AuthenticatedUser): Promise<number> {
    const uniqueIds = [...new Set(ids)];
    const result = await prisma.$transaction(async (transaction) => {
      const media = await this.repository.findManyByIds(uniqueIds, transaction);
      const deleted = await this.repository.deleteMany(uniqueIds, transaction);

      return { media, count: deleted.count };
    });

    await Promise.all(
      result.media.map(({ path }) => this.fileService.removeAfterCommit(path)),
    );

    if (result.count > 0) {
      await this.activityLogService.logBulk(
        user,
        'DELETE',
        'MEDIA',
        result.count,
      );
    }

    return result.count;
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
