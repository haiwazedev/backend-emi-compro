import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { DivisionRepository } from '../repositories/division.repository.js';
import type {
  CreateDivisionInput,
  DivisionListQuery,
  ReorderDivisionsInput,
  UpdateDivisionInput,
} from '../schemas/division.schema.js';

export class DivisionService {
  constructor(private readonly repository = new DivisionRepository()) {}

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
    return this.repository.create({
      name: input.name,
      abbr: input.abbr,
      iconSvg: input.icon_svg ?? null,
      ...(input.status !== undefined ? { status: input.status } : {}),
      createdBy: getAuditName(userName),
    });
  }

  async update(id: number, input: UpdateDivisionInput, userName: string) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one division field is required.');
    }

    const data: Prisma.DivisionUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
    };

    if (input.name !== undefined) data.name = input.name;
    if (input.abbr !== undefined) data.abbr = input.abbr;
    if (input.icon_svg !== undefined) data.iconSvg = input.icon_svg;
    if (input.status !== undefined) data.status = input.status;

    try {
      return await this.repository.update(id, data);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Division was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Division was not found.');
      }

      throw error;
    }
  }
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
