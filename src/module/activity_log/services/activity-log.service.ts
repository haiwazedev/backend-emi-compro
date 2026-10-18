import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
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

  // Best effort: the user's change is already saved, so a failed log must not
  // turn the request into an error.
  async log(
    user: AuthenticatedUser,
    actionType: string,
    actionResult: string,
  ): Promise<void> {
    try {
      await this.repository.create({
        userId: user.id,
        actionType: actionType.slice(0, MAX_TEXT_LENGTH),
        actionResult: actionResult.slice(0, MAX_TEXT_LENGTH),
        createdBy: user.name.slice(0, 100),
      });
    } catch (error) {
      console.error('Failed to write activity log.', error);
    }
  }
}
