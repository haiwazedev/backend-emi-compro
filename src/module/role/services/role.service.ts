import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { PermissionRepository } from '../repositories/permission.repository.js';
import { RoleRepository } from '../repositories/role.repository.js';
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from '../schemas/role.schema.js';

export class RoleService {
  constructor(
    private readonly repository = new RoleRepository(),
    private readonly permissionRepository = new PermissionRepository(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  list() {
    return this.repository.findMany();
  }

  async getById(id: number) {
    const role = await this.repository.findById(id);

    if (!role) {
      throw new ApiError(404, 'Role was not found.');
    }

    return role;
  }

  async create(input: CreateRoleInput, user: AuthenticatedUser) {
    if (await this.repository.findByName(input.name)) {
      throw new ApiError(409, 'Role name is already in use.');
    }

    const permissions = await this.permissionRepository.findMany();

    try {
      const role = await this.repository.create(
        input,
        permissions.map((permission) => permission.id),
        user.name,
      );
      await this.activityLogService.log(user, 'CREATE', 'ROLE', role.name);
      return role;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(409, 'Role name is already in use.');
      }

      throw error;
    }
  }

  async update(id: number, input: UpdateRoleInput, user: AuthenticatedUser) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one role field is required.');
    }

    if (input.name) {
      const existing = await this.repository.findByName(input.name);

      if (existing && existing.id !== id) {
        throw new ApiError(409, 'Role name is already in use.');
      }
    }

    try {
      const role = await this.repository.update(id, input, user.name);
      await this.activityLogService.log(user, 'UPDATE', 'ROLE', role.name);
      return role;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(409, 'Role name is already in use.');
      }

      if (isRecordNotFoundError(error)) {
        throw new ApiError(404, 'Role was not found.');
      }

      throw error;
    }
  }

  // Also deletes every user assigned to this role.
  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const role = await this.getById(id);

    if (await this.repository.hasUser(id, user.id)) {
      throw new ApiError(400, 'You cannot delete your own role.');
    }

    try {
      await this.repository.delete(id);
      await this.activityLogService.log(user, 'DELETE', 'ROLE', role.name);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiError(404, 'Role was not found.');
      }

      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaError(error, 'P2002');
}

function isRecordNotFoundError(error: unknown): boolean {
  return isPrismaError(error, 'P2025');
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
