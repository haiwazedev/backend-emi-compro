import { prisma } from '../../../shared/db/prisma.js';

export class LanguageRepository {
  findActive() {
    return prisma.language.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: string) {
    return prisma.language.findUnique({ where: { id } });
  }
}
