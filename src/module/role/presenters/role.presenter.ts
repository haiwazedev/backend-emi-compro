import type {
  Permission,
  Prisma,
  RolePermission,
} from '../../../generated/prisma/client.js';
import type { roleInclude } from '../repositories/role.repository.js';

export type RoleWithCount = Prisma.RoleGetPayload<{
  include: typeof roleInclude;
}>;

export function presentRole(role: RoleWithCount) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    user_count: role._count.userRoles,
    created_at: role.createdAt.toISOString(),
    created_by: role.createdBy,
    updated_at: role.updatedAt?.toISOString() ?? null,
    updated_by: role.updatedBy,
  };
}

export function presentPermission(permission: Permission) {
  return {
    id: permission.id,
    name: permission.name,
  };
}

export function presentRolePermission(rolePermission: RolePermission) {
  return {
    role_id: rolePermission.roleId,
    permission_id: rolePermission.permissionId,
    is_allowed: rolePermission.isAllowed,
    updated_at: rolePermission.updatedAt?.toISOString() ?? null,
    updated_by: rolePermission.updatedBy,
  };
}
