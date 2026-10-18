import type { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';

export const roleInclude = {
  _count: { select: { userRoles: true } },
} satisfies Prisma.RoleInclude;

export class RoleRepository {
  findMany() {
    return prisma.role.findMany({
      include: roleInclude,
      orderBy: { id: 'asc' },
    });
  }

  findById(id: number) {
    return prisma.role.findUnique({ where: { id }, include: roleInclude });
  }

  findByName(name: string) {
    return prisma.role.findUnique({ where: { name }, select: { id: true } });
  }

  // Nested create runs in one statement batch, so a role never exists without its permission rows.
  create(
    data: { name: string; description?: string | null },
    permissionIds: number[],
    userName: string,
  ) {
    return prisma.role.create({
      include: roleInclude,
      data: {
        ...data,
        createdBy: userName,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
            createdBy: userName,
          })),
        },
      },
    });
  }

  update(
    id: number,
    data: { name?: string; description?: string | null },
    userName: string,
  ) {
    return prisma.role.update({
      include: roleInclude,
      where: { id },
      data: { ...data, updatedAt: new Date(), updatedBy: userName },
    });
  }

  hasUser(roleId: number, userId: number) {
    return prisma.userRole
      .count({ where: { roleId, userId } })
      .then((count) => count > 0);
  }

  // Deletes the role's users first (their user_roles rows cascade), then the role.
  delete(id: number) {
    return prisma.$transaction([
      prisma.user.deleteMany({ where: { userRole: { roleId: id } } }),
      prisma.role.delete({ where: { id } }),
    ]);
  }
}
