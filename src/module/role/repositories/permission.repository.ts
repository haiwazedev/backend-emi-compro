import { prisma } from '../../../shared/db/prisma.js';

export class PermissionRepository {
  findMany() {
    return prisma.permission.findMany({ orderBy: { id: 'asc' } });
  }
}
