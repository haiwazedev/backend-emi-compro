import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import {
  createAuthMiddleware,
  requireManageUsers,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { PermissionController } from '../controllers/permission.controller.js';
import { RolePermissionController } from '../controllers/role-permission.controller.js';
import { RoleController } from '../controllers/role.controller.js';
import { updateRolePermissionBodySchema } from '../schemas/role-permission.schema.js';
import {
  createRoleBodySchema,
  updateRoleBodySchema,
} from '../schemas/role.schema.js';

const roleController = new RoleController();
const permissionController = new PermissionController();
const rolePermissionController = new RolePermissionController();
const requireAuth = createAuthMiddleware(new AuthService());

export const roleRouter = Router();

roleRouter.get('/roles', requireAuth, requireManageUsers, roleController.list);
roleRouter.get(
  '/roles/:roleId',
  requireAuth,
  requireManageUsers,
  roleController.get,
);
roleRouter.post(
  '/roles',
  requireAuth,
  requireManageUsers,
  validateBody(createRoleBodySchema),
  roleController.create,
);
roleRouter.put(
  '/roles/:roleId',
  requireAuth,
  requireManageUsers,
  validateBody(updateRoleBodySchema),
  roleController.update,
);
roleRouter.delete(
  '/roles/:roleId',
  requireAuth,
  requireManageUsers,
  roleController.delete,
);

roleRouter.get(
  '/permissions',
  requireAuth,
  requireManageUsers,
  permissionController.list,
);

roleRouter.get(
  '/role_permissions',
  requireAuth,
  requireManageUsers,
  rolePermissionController.list,
);
roleRouter.put(
  '/role_permissions/:roleId/:permissionId',
  requireAuth,
  requireManageUsers,
  validateBody(updateRolePermissionBodySchema),
  rolePermissionController.update,
);
