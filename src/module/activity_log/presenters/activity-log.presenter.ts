import type { ActivityLog } from '../../../generated/prisma/client.js';

export function presentActivityLog(
  activityLog: ActivityLog & { user: { name: string } },
) {
  return {
    id: activityLog.id,
    name: activityLog.user.name,
    action_type: activityLog.actionType,
    action_result: activityLog.actionResult,
    created_at: activityLog.createdAt.toISOString(),
  };
}
