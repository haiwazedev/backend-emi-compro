import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { ActivityLogController } from '../controllers/activity-log.controller.js';
import { activityLogListQuerySchema } from '../schemas/activity-log.schema.js';

const controller = new ActivityLogController();
const requireAuth = createAuthMiddleware(new AuthService());

export const activityLogRouter = Router();

activityLogRouter.get(
  '/activity-logs',
  requireAuth,
  validateQuery(activityLogListQuerySchema, 'activityLogListQuery'),
  controller.list,
);
