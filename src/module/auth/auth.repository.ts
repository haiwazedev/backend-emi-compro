import { prisma } from '../../shared/db/prisma.js';

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }

  updateLastSignedIn(userId: number) {
    return prisma.userRole.updateMany({
      where: { userId },
      data: { lastSignedIn: new Date() },
    });
  }

  createUser(data: { name: string; email: string; password: string }) {
    return prisma.user.create({
      data: { ...data, userRole: { create: { createdBy: data.name } } },
    });
  }
}
