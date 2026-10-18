import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { UserController } from '../controllers/user.controller.js';
import {
  createUserBodySchema,
  updateUserBodySchema,
  userListQuerySchema,
} from '../schemas/user.schema.js';

const controller = new UserController();
const requireAuth = createAuthMiddleware(new AuthService());

export const userRouter = Router();

userRouter.get(
  '/users',
  requireAuth,
  validateQuery(userListQuerySchema, 'userListQuery'),
  controller.list,
);
userRouter.get('/users/:userId', requireAuth, controller.get);
userRouter.post(
  '/users',
  requireAuth,
  validateBody(createUserBodySchema),
  controller.create,
);
userRouter.put(
  '/users/:userId',
  requireAuth,
  validateBody(updateUserBodySchema),
  controller.update,
);
userRouter.delete('/users/:userId', requireAuth, controller.delete);
