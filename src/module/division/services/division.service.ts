import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
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
  ) {}

  list(query: DivisionListQuery) {
    return this.repository.findMany(query);
  }

  async getById(id: number) {
    const division = await this.repository.findById(id);

    if (!division) {
      throw new ApiError(404, 'Division was not found.');
    }

    return division;
  }

  async reorder(input: ReorderDivisionsInput) {
    const divisions = await this.repository.reorder(input.division_ids);

    if (!divisions) {
      throw new ApiError(
        400,
        'division_ids must contain every existing division ID exactly once.',
      );
    }

    return divisions;
  }

  async create(input: CreateDivisionInput, userName: string) {
    await this.languageService.requireActive(input.language_id);

    try {
      return await this.repository.create(
        {
          iconSvg: input.icon_svg ?? null,
          ...(input.status !== undefined ? { status: input.status } : {}),
          createdBy: getAuditName(userName),
        },
        {
          languageId: input.language_id,
          name: input.name,
          abbr: input.abbr,
          description: input.description ?? null,
        },
      );
    } catch (error) {
      throw mapDivisionError(error);
    }
  }

  async update(id: number, input: UpdateDivisionInput, userName: string) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one division field is required.');
    }

    if (input.language_id !== undefined) {
      await this.languageService.requireActive(input.language_id);
    }

    const data: Prisma.DivisionUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
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

      return division;
    } catch (error) {
      throw mapDivisionError(error);
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      throw mapDivisionError(error);
    }
  }
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
