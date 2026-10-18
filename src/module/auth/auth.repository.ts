import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../shared/db/prisma.js';

export const authUserInclude = {
  userRole: {
    include: {
      role: {
        include: {
          rolePermissions: {
            where: { isAllowed: true },
            include: { permission: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type AuthUser = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: authUserInclude,
    });
  }

  findById(id: number) {
    return prisma.user.findUnique({ where: { id }, include: authUserInclude });
  }

  updateLastSignedIn(userId: number) {
    return prisma.userRole.updateMany({
      where: { userId },
      data: { lastSignedIn: new Date() },
    });
  }
}
