import { prisma } from '../../../shared/db/prisma.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { MediaRepository } from '../repositories/media.repository.js';
import type { MediaListQuery, MediaType } from '../schemas/media.schema.js';
import { MediaFileService } from './media-file.service.js';

export class MediaService {
  constructor(
    private readonly repository = new MediaRepository(),
    private readonly fileService = new MediaFileService(),
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
    type: MediaType,
    userName: string,
  ) {
    if (!file) {
      throw new ApiError(400, 'File is required.');
    }

    if (userName.length > 100) {
      throw new ApiError(
        400,
        'Authenticated user name exceeds 100 characters.',
      );
    }

    const details = this.fileService.describeUpload(file, type);
    let fileStored = false;

    try {
      const media = await prisma.$transaction(async (transaction) => {
        const created = await this.repository.create(
          {
            filename: details.filename,
            path: details.path,
            extension: details.extension,
            type,
            size: details.size,
            metadata: details.metadata,
            createdBy: userName,
          },
          transaction,
        );

        await this.fileService.store(details.filename, file.buffer);
        fileStored = true;
        return created;
      });

      return media;
    } catch (error) {
      if (fileStored) {
        await this.fileService.removeAfterCommit(details.filename);
      }

      if (isPrismaError(error, 'P2002')) {
        throw new ApiError(
          409,
          'A media item with this filename already exists.',
        );
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const media = await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Media was not found.');
      }

      throw error;
    }

    await this.fileService.removeAfterCommit(media.filename);
  }

  async bulkDelete(ids: number[]): Promise<number> {
    const uniqueIds = [...new Set(ids)];
    const result = await prisma.$transaction(async (transaction) => {
      const media = await this.repository.findManyByIds(uniqueIds, transaction);
      const deleted = await this.repository.deleteMany(uniqueIds, transaction);

      return { media, count: deleted.count };
    });

    await Promise.all(
      result.media.map(({ filename }) =>
        this.fileService.removeAfterCommit(filename),
      ),
    );

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
