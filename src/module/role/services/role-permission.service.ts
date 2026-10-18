import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { RolePermissionRepository } from '../repositories/role-permission.repository.js';

export class RolePermissionService {
  constructor(
    private readonly repository = new RolePermissionRepository(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  list() {
    return this.repository.findMany();
  }

  async update(
    roleId: number,
    permissionId: number,
    isAllowed: boolean,
    user: AuthenticatedUser,
  ) {
    try {
      const rolePermission = await this.repository.update(
        roleId,
        permissionId,
        isAllowed,
        user.name,
      );
      await this.activityLogService.log(
        user,
        'memperbarui hak akses peran',
        `${rolePermission.role.name}: ${rolePermission.permission.name}`,
      );
      return rolePermission;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new ApiError(404, 'Role permission was not found.');
      }

      throw error;
    }
  }
}
