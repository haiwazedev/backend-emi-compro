import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import {
  createAuthMiddleware,
  requireManageUsers,
} from '../../auth/auth.middleware.js';
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
  requireManageUsers,
  validateQuery(userListQuerySchema, 'userListQuery'),
  controller.list,
);
userRouter.get(
  '/users/:userId',
  requireAuth,
  requireManageUsers,
  controller.get,
);
userRouter.post(
  '/users',
  requireAuth,
  requireManageUsers,
  validateBody(createUserBodySchema),
  controller.create,
);
userRouter.put(
  '/users/:userId',
  requireAuth,
  requireManageUsers,
  validateBody(updateUserBodySchema),
  controller.update,
);
userRouter.post(
  '/users/:userId/invite',
  requireAuth,
  requireManageUsers,
  controller.resendInvite,
);
userRouter.delete(
  '/users/:userId',
  requireAuth,
  requireManageUsers,
  controller.delete,
);
