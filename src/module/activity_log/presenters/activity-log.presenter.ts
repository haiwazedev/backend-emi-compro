import type { ActivityLog } from '../../../generated/prisma/client.js';

export function presentActivityLog(activityLog: ActivityLog) {
  return {
    id: activityLog.id,
    name: activityLog.userName,
    action_type: activityLog.actionType,
    action_result: activityLog.actionResult,
    created_at: activityLog.createdAt.toISOString(),
  };
}
