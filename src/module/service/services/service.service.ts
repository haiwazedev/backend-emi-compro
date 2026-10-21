import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { DivisionRepository } from '../../division/repositories/division.repository.js';
import { LanguageService } from '../../language/services/language.service.js';
import { MediaRepository } from '../../media/repositories/media.repository.js';
import { ServiceRepository } from '../repositories/service.repository.js';
import type {
  CreateServiceInput,
  ReorderServicesInput,
  UpdateServiceInput,
} from '../schemas/service.schema.js';

export class ServiceService {
  constructor(
    private readonly repository = new ServiceRepository(),
    private readonly divisionRepository = new DivisionRepository(),
    private readonly mediaRepository = new MediaRepository(),
    private readonly languageService = new LanguageService(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  list(includeDrafts: boolean) {
    return this.repository.findMany(includeDrafts);
  }

  async getById(id: number, includeDrafts = true) {
    const service = await this.repository.findById(id, includeDrafts);

    if (!service) {
      throw new ApiError(404, 'Service was not found.');
    }

    return service;
  }

  async create(input: CreateServiceInput, user: AuthenticatedUser) {
    await this.requireDivision(input.division_id);
    await this.languageService.requireActive(input.language_id);
    const mediaIds = input.media_ids ?? [];
    await this.requirePictureMedia(mediaIds);

    try {
      const service = await this.repository.create(
        {
          divisionId: input.division_id,
          createdBy: getAuditName(user.name),
        },
        {
          languageId: input.language_id,
          name: input.name,
          description: input.description ?? null,
        },
        mediaIds,
      );
      await this.activityLogService.log(
        user,
        'menambahkan layanan',
        input.name,
      );
      return service;
    } catch (error) {
      throw mapServiceError(error);
    }
  }

  async update(id: number, input: UpdateServiceInput, user: AuthenticatedUser) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one service field is required.');
    }

    if (input.division_id !== undefined) {
      await this.requireDivision(input.division_id);
    }
    if (input.language_id !== undefined) {
      await this.languageService.requireActive(input.language_id);
    }
    if (input.media_ids !== undefined) {
      await this.requirePictureMedia(input.media_ids);
    }

    const data: Prisma.ServiceUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(user.name),
    };

    if (input.division_id !== undefined) data.divisionId = input.division_id;

    const content =
      input.language_id !== undefined
        ? {
            languageId: input.language_id,
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
          }
        : undefined;

    try {
      const service = await this.repository.update(
        id,
        data,
        content,
        input.division_id,
        input.media_ids,
      );

      if (!service) {
        throw new ApiError(
          400,
          'name is required when adding a service translation.',
        );
      }

      await this.activityLogService.log(
        user,
        'memperbarui layanan',
        serviceName(service),
      );
      return service;
    } catch (error) {
      throw mapServiceError(error);
    }
  }

  async reorder(input: ReorderServicesInput, user: AuthenticatedUser) {
    const result = await this.repository.reorderByDivision(
      input.division_id,
      input.service_ids,
    );

    if (result.status === 'division-not-found') {
      throw new ApiError(400, 'Division does not exist.');
    }

    if (result.status === 'invalid-service-ids') {
      throw new ApiError(
        400,
        'service_ids must contain every service ID for the division exactly once.',
      );
    }

    await this.activityLogService.log(user, 'memperbarui urutan', 'Layanan');
    return result.services;
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const service = await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      throw mapServiceError(error);
    }

    await this.activityLogService.log(
      user,
      'menghapus layanan',
      serviceName(service),
    );
  }

  private async requireDivision(id: number): Promise<void> {
    if (!(await this.divisionRepository.findById(id))) {
      throw new ApiError(400, 'Division does not exist.');
    }
  }

  private async requirePictureMedia(ids: number[]): Promise<void> {
    if (new Set(ids).size !== ids.length) {
      throw new ApiError(400, 'media_ids must contain unique IDs.');
    }

    if (ids.length === 0) return;

    const media = await this.mediaRepository.findManyByIds(ids);

    if (
      media.length !== ids.length ||
      media.some((item) => item.type !== 'PICTURE')
    ) {
      throw new ApiError(
        400,
        'media_ids must reference existing picture media items.',
      );
    }
  }
}

// Contents are ordered by language, so the first is the default name.
function serviceName(service: { id: number; contents: { name: string }[] }) {
  return service.contents[0]?.name ?? `Layanan #${service.id}`;
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function mapServiceError(error: unknown): unknown {
  if (isPrismaError(error, 'P2003')) {
    return new ApiError(
      400,
      'A referenced division, language, or picture media item does not exist.',
    );
  }

  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Service was not found.');
  }

  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
