import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { ActivityLogListQuery } from '../schemas/activity-log.schema.js';

export class ActivityLogRepository {
  findMany(query: ActivityLogListQuery) {
    return prisma.activityLog.findMany({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  count() {
    return prisma.activityLog.count();
  }

  create(data: Prisma.ActivityLogUncheckedCreateInput) {
    return prisma.activityLog.create({ data });
  }
}
