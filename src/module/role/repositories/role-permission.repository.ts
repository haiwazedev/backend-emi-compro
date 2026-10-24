import { prisma } from '../../../shared/db/prisma.js';

export class RolePermissionRepository {
  findMany() {
    return prisma.rolePermission.findMany({
      orderBy: [{ roleId: 'asc' }, { permissionId: 'asc' }],
    });
  }

  findOne(roleId: number, permissionId: number) {
    return prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
      include: { permission: true },
    });
  }

  update(
    roleId: number,
    permissionId: number,
    isAllowed: boolean,
    userName: string,
  ) {
    return prisma.rolePermission.update({
      where: { roleId_permissionId: { roleId, permissionId } },
      data: { isAllowed, updatedAt: new Date(), updatedBy: userName },
      include: { role: true, permission: true },
    });
  }
}
