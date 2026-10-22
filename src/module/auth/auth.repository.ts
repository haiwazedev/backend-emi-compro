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

  // Returns false when the token was already used by a concurrent request.
  setPasswordWithToken(
    tokenId: number,
    userId: number,
    passwordHash: string,
    activate: boolean,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.userToken.deleteMany({
        where: { id: tokenId },
      });

      if (count === 0) {
        return false;
      }

      await tx.user.update({
        where: { id: userId },
        data: { password: passwordHash, passwordChangedAt: new Date() },
      });

      if (activate) {
        await tx.userRole.updateMany({
          where: { userId },
          data: { isActive: true },
        });
      }

      await tx.userToken.deleteMany({ where: { userId } });
      return true;
    });
  }

  updateLastSignedIn(userId: number) {
    return prisma.userRole.updateMany({
      where: { userId },
      data: { lastSignedIn: new Date() },
    });
  }
}
