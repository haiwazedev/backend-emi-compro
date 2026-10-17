import { prisma } from '../../../shared/db/prisma.js';

export class LanguageRepository {
  findActive() {
    return prisma.language.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  }

  findById(id: number) {
    return prisma.language.findUnique({ where: { id } });
  }

  findByAbbreviation(abbreviatedLanguage: string) {
    return prisma.language.findUnique({ where: { abbreviatedLanguage } });
  }
}
