import type { Request, Response } from 'express';
import { presentActivityLog } from '../presenters/activity-log.presenter.js';
import type { ActivityLogListQuery } from '../schemas/activity-log.schema.js';
import { ActivityLogService } from '../services/activity-log.service.js';

export class ActivityLogController {
  constructor(private readonly service = new ActivityLogService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.activityLogListQuery as ActivityLogListQuery;
    const result = await this.service.list(query);

    res.status(200).json({
      activityLogs: result.activityLogs.map(presentActivityLog),
      pagination: result.pagination,
    });
  };
}
