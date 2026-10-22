import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { LanguageService } from '../../language/services/language.service.js';
import { DivisionRepository } from '../repositories/division.repository.js';
import type {
  CreateDivisionInput,
  DivisionListQuery,
  ReorderDivisionsInput,
  UpdateDivisionInput,
} from '../schemas/division.schema.js';

export class DivisionService {
  constructor(
    private readonly repository = new DivisionRepository(),
    private readonly languageService = new LanguageService(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  list(query: DivisionListQuery, includeDrafts: boolean) {
    return this.repository.findMany(query, includeDrafts);
  }

  async getById(id: number, includeDrafts = true) {
    const division = await this.repository.findById(id, includeDrafts);

    if (!division) {
      throw new ApiError(404, 'Division was not found.');
    }

    return division;
  }

  async reorder(input: ReorderDivisionsInput, user: AuthenticatedUser) {
    const divisions = await this.repository.reorder(input.division_ids);

    if (!divisions) {
      throw new ApiError(
        400,
        'division_ids must contain every existing division ID exactly once.',
      );
    }

    await this.activityLogService.log(user, 'memperbarui urutan', 'Divisi');
    return divisions;
  }

  async create(input: CreateDivisionInput, user: AuthenticatedUser) {
    await this.languageService.requireActive(input.language_id);

    try {
      const division = await this.repository.create(
        {
          iconSvg: input.icon_svg ?? null,
          ...(input.status !== undefined ? { status: input.status } : {}),
          createdBy: getAuditName(user.name),
        },
        {
          languageId: input.language_id,
          name: input.name,
          abbr: input.abbr,
          description: input.description ?? null,
        },
      );
      await this.activityLogService.log(user, 'menambahkan divisi', input.name);
      return division;
    } catch (error) {
      throw mapDivisionError(error);
    }
  }

  async update(
    id: number,
    input: UpdateDivisionInput,
    user: AuthenticatedUser,
  ) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one division field is required.');
    }

    if (input.language_id !== undefined) {
      await this.languageService.requireActive(input.language_id);
    }

    const data: Prisma.DivisionUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(user.name),
    };

    if (input.icon_svg !== undefined) data.iconSvg = input.icon_svg;
    if (input.status !== undefined) data.status = input.status;

    const content =
      input.language_id !== undefined
        ? {
            languageId: input.language_id,
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.abbr !== undefined ? { abbr: input.abbr } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
          }
        : undefined;

    try {
      const division = await this.repository.update(id, data, content);

      if (!division) {
        throw new ApiError(
          400,
          'name and abbr are required when adding a division translation.',
        );
      }

      await this.activityLogService.log(
        user,
        'memperbarui divisi',
        divisionName(division),
      );
      return division;
    } catch (error) {
      throw mapDivisionError(error);
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const division = await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      throw mapDivisionError(error);
    }

    await this.activityLogService.log(
      user,
      'menghapus divisi',
      divisionName(division),
    );
  }
}

// Contents are ordered by language, so the first is the default name.
function divisionName(division: { id: number; contents: { name: string }[] }) {
  return division.contents[0]?.name ?? `Divisi #${division.id}`;
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function mapDivisionError(error: unknown): unknown {
  if (isPrismaError(error, 'P2003')) {
    return new ApiError(400, 'Language does not exist or is inactive.');
  }

  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Division was not found.');
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
