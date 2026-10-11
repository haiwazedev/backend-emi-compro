import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { DivisionController } from '../controllers/division.controller.js';
import {
  createDivisionBodySchema,
  divisionListQuerySchema,
  reorderDivisionsBodySchema,
  updateDivisionBodySchema,
} from '../schemas/division.schema.js';

const controller = new DivisionController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const divisionRouter = Router();

divisionRouter.get(
  '/divisions',
  validateQuery(divisionListQuerySchema, 'divisionListQuery'),
  controller.list,
);
divisionRouter.get('/divisions/:divisionId', controller.get);
divisionRouter.post(
  '/divisions/reorder',
  requireAuth,
  validateBody(reorderDivisionsBodySchema),
  controller.reorder,
);
divisionRouter.post(
  '/divisions',
  requireAuth,
  validateBody(createDivisionBodySchema),
  controller.create,
);
divisionRouter.put(
  '/divisions/:divisionId',
  requireAuth,
  validateBody(updateDivisionBodySchema),
  controller.update,
);
divisionRouter.delete('/divisions/:divisionId', requireAuth, controller.delete);
