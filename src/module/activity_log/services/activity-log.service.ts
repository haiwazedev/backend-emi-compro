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
const actionVerbs: Record<ActivityAction, string> = {
  CREATE: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
  REORDER: 'reordered',
  RESEND_INVITE: 'resent invite for',
};

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
    const actor = user.name.slice(0, 100);

    try {
      await this.repository.create({
        ...data,
        userName: actor,
        createdBy: actor,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          component: 'activity_log',
          operation: 'persist_activity',
          action: data.action,
          resource: data.resource,
        },
        'Failed to write activity log.',
      );
    }

    logger.info(
      {
        eventType: 'business_action',
        actor,
        action: data.action,
        resource: data.resource,
        ...(data.actionResult && { actionResult: data.actionResult }),
        ...(data.itemCount != null && { itemCount: data.itemCount }),
      },
      buildActivityMessage(actor, data),
    );
  }
}

function buildActivityMessage(
  actor: string,
  data: Pick<
    Prisma.ActivityLogUncheckedCreateInput,
    'action' | 'resource' | 'actionResult' | 'itemCount'
  >,
): string {
  const resource = data.resource.toLowerCase().replaceAll('_', ' ');
  const verb = actionVerbs[data.action];

  if (data.action === 'RESEND_INVITE') {
    return data.actionResult
      ? `${actor} ${verb} ${resource}: ${data.actionResult}`
      : `${actor} ${verb} ${resource}`;
  }

  if (data.itemCount != null) {
    const itemLabel = data.itemCount === 1 ? 'item' : 'items';
    return `${actor} ${verb} ${data.itemCount} ${resource} ${itemLabel}`;
  }

  if (data.actionResult) {
    return `${actor} ${verb} ${resource}: ${data.actionResult}`;
  }

  return `${actor} ${verb} ${resource}`;
}
