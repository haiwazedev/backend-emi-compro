import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { DivisionRepository } from '../../division/repositories/division.repository.js';
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
  ) {}

  list() {
    return this.repository.findMany();
  }

  async getById(id: number) {
    const service = await this.repository.findById(id);

    if (!service) {
      throw new ApiError(404, 'Service was not found.');
    }

    return service;
  }

  async create(input: CreateServiceInput, userName: string) {
    await this.requireDivision(input.division_id);

    try {
      return await this.repository.create({
        divisionId: input.division_id,
        name: input.name,
        createdBy: getAuditName(userName),
      });
    } catch (error) {
      throw mapServiceError(error);
    }
  }

  async update(id: number, input: UpdateServiceInput, userName: string) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one service field is required.');
    }

    if (input.division_id !== undefined) {
      await this.requireDivision(input.division_id);
    }

    const data: Prisma.ServiceUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
    };

    if (input.division_id !== undefined) data.divisionId = input.division_id;
    if (input.name !== undefined) data.name = input.name;

    try {
      return await this.repository.update(id, data, input.division_id);
    } catch (error) {
      throw mapServiceError(error);
    }
  }

  async reorder(input: ReorderServicesInput) {
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

    return result.services;
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      throw mapServiceError(error);
    }
  }

  private async requireDivision(id: number): Promise<void> {
    if (!(await this.divisionRepository.findById(id))) {
      throw new ApiError(400, 'Division does not exist.');
    }
  }
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function mapServiceError(error: unknown): unknown {
  if (isPrismaError(error, 'P2003')) {
    return new ApiError(400, 'Division does not exist.');
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
