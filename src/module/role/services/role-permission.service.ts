import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { RolePermissionRepository } from '../repositories/role-permission.repository.js';
import { RoleRepository } from '../repositories/role.repository.js';

export class RolePermissionService {
  constructor(
    private readonly repository = new RolePermissionRepository(),
    private readonly roleRepository = new RoleRepository(),
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
    const current = await this.repository.findOne(roleId, permissionId);

    if (!current) {
      throw new ApiError(404, 'Role permission was not found.');
    }

    // Keeps at least the acting user able to manage users and roles.
    if (
      !isAllowed &&
      current.permission.name === 'manage_users' &&
      (await this.roleRepository.hasUser(roleId, user.id))
    ) {
      throw new ApiError(
        400,
        'You cannot remove user management from your own role.',
      );
    }

    try {
      const rolePermission = await this.repository.update(
        roleId,
        permissionId,
        isAllowed,
        user.name,
      );
      await this.activityLogService.log(
        user,
        'UPDATE',
        'ROLE_PERMISSION',
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
