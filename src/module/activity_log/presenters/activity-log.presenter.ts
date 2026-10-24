import type { ActivityLog } from '../../../generated/prisma/client.js';

export function presentActivityLog(activityLog: ActivityLog) {
  return {
    id: activityLog.id,
    name: activityLog.userName,
    action: activityLog.action,
    resource: activityLog.resource,
    action_result: activityLog.actionResult,
    item_count: activityLog.itemCount,
    created_at: activityLog.createdAt.toISOString(),
  };
}
