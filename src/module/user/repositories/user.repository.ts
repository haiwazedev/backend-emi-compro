import type { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { UserListQuery } from '../schemas/user.schema.js';

export const userInclude = {
  userRole: { include: { role: true } },
} satisfies Prisma.UserInclude;

type UserRoleFields = { roleId?: number | null; isActive?: boolean };

export class UserRepository {
  findMany(query: UserListQuery) {
    return prisma.user.findMany({
      where: buildListWhere(query),
      include: userInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  count(query: UserListQuery) {
    return prisma.user.count({ where: buildListWhere(query) });
  }

  countAll() {
    return prisma.user.count();
  }

  findById(id: number) {
    return prisma.user.findUnique({ where: { id }, include: userInclude });
  }

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  create(
    data: { name: string; email: string },
    userRole: UserRoleFields,
    userName: string,
  ) {
    return prisma.user.create({
      data: {
        ...data,
        userRole: { create: { ...userRole, createdBy: userName } },
      },
      include: userInclude,
    });
  }

  update(
    id: number,
    data: { name?: string; email?: string },
    userRole: UserRoleFields,
    userName: string,
  ) {
    const hasUserRoleChange = Object.keys(userRole).length > 0;

    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(hasUserRoleChange && {
          userRole: {
            upsert: {
              create: { ...userRole, createdBy: userName },
              update: {
                ...userRole,
                updatedAt: new Date(),
                updatedBy: userName,
              },
            },
          },
        }),
      },
      include: userInclude,
    });
  }

  delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}

function buildListWhere({
  search,
  role_id,
}: UserListQuery): Prisma.UserWhereInput {
  return {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role_id && { userRole: { roleId: role_id } }),
  };
}
