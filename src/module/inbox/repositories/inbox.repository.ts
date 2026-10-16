import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { InboxListQuery } from '../schemas/inbox.schema.js';

export class InboxRepository {
  findMany(query: InboxListQuery) {
    return prisma.inbox.findMany({
      where: this.buildWhere(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { inboxSubject: true },
    });
  }

  count(query: InboxListQuery) {
    return prisma.inbox.count({ where: this.buildWhere(query) });
  }

  countByReadStatus(isRead: boolean) {
    return prisma.inbox.count({ where: { isRead } });
  }

  findById(id: number) {
    return prisma.inbox.findUnique({ where: { id } });
  }

  findSubjectById(id: number) {
    return prisma.inboxSubject.findUnique({ where: { id } });
  }

  findSubjects() {
    return prisma.inboxSubject.findMany({ orderBy: { id: 'asc' } });
  }

  create(data: Prisma.InboxUncheckedCreateInput) {
    return prisma.inbox.create({ data, include: { inboxSubject: true } });
  }

  update(id: number, data: Prisma.InboxUncheckedUpdateInput) {
    return prisma.inbox.update({
      where: { id },
      data,
      include: { inboxSubject: true },
    });
  }

  markAllRead() {
    return prisma.inbox.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  delete(id: number) {
    return prisma.inbox.delete({ where: { id } });
  }

  private buildWhere(query: InboxListQuery): Prisma.InboxWhereInput {
    return {
      ...(query.inbox_subject_id
        ? { inboxSubjectId: query.inbox_subject_id }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              {
                inboxSubject: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }
}
