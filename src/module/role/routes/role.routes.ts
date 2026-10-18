import { Router } from 'express';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
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

roleRouter.get('/roles', requireAuth, roleController.list);
roleRouter.get('/roles/:roleId', requireAuth, roleController.get);
roleRouter.post(
  '/roles',
  requireAuth,
  validateBody(createRoleBodySchema),
  roleController.create,
);
roleRouter.put(
  '/roles/:roleId',
  requireAuth,
  validateBody(updateRoleBodySchema),
  roleController.update,
);
roleRouter.delete('/roles/:roleId', requireAuth, roleController.delete);

roleRouter.get('/permissions', requireAuth, permissionController.list);

roleRouter.get('/role_permissions', requireAuth, rolePermissionController.list);
roleRouter.put(
  '/role_permissions/:roleId/:permissionId',
  requireAuth,
  validateBody(updateRolePermissionBodySchema),
  rolePermissionController.update,
);
