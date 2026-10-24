import { prisma } from '../../../shared/db/prisma.js';

export class AppConfigRepository {
  findAll() {
    return prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async findValue(key: string): Promise<string | null> {
    const config = await prisma.appConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  }
}
