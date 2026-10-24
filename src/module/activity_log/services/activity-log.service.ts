import type {
  ActivityAction,
  ActivityResource,
  Prisma,
} from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { logger } from '../../../shared/logging/logger.js';
import { ActivityLogRepository } from '../repositories/activity-log.repository.js';
import type { ActivityLogListQuery } from '../schemas/activity-log.schema.js';

const MAX_TEXT_LENGTH = 255;

export class ActivityLogService {
  constructor(private readonly repository = new ActivityLogRepository()) {}

  async list(query: ActivityLogListQuery) {
    const [activityLogs, totalItems] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(),
    ]);

    return {
      activityLogs,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  // `result` is the affected item's name, shown as is; the CMS translates
  // `action` and `resource`.
  log(
    user: AuthenticatedUser,
    action: ActivityAction,
    resource: ActivityResource,
    result?: string,
  ): Promise<void> {
    return this.write(user, {
      action,
      resource,
      actionResult: result?.slice(0, MAX_TEXT_LENGTH),
    });
  }

  logBulk(
    user: AuthenticatedUser,
    action: ActivityAction,
    resource: ActivityResource,
    itemCount: number,
  ): Promise<void> {
    return this.write(user, { action, resource, itemCount });
  }

  // Best effort: the user's change is already saved, so a failed log must not
  // turn the request into an error.
  private async write(
    user: AuthenticatedUser,
    data: Pick<
      Prisma.ActivityLogUncheckedCreateInput,
      'action' | 'resource' | 'actionResult' | 'itemCount'
    >,
  ): Promise<void> {
    try {
      await this.repository.create({
        ...data,
        userName: user.name.slice(0, 100),
        createdBy: user.name.slice(0, 100),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to write activity log.');
    }
  }
}
