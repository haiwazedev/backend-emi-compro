import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { presentRolePermission } from '../presenters/role.presenter.js';
import type { UpdateRolePermissionInput } from '../schemas/role-permission.schema.js';
import { RolePermissionService } from '../services/role-permission.service.js';

export class RolePermissionController {
  constructor(private readonly service = new RolePermissionService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const rolePermissions = await this.service.list();

    res.status(200).json({
      rolePermissions: rolePermissions.map(presentRolePermission),
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const rolePermission = await this.service.update(
      parseIdParam(req.params.roleId),
      parseIdParam(req.params.permissionId),
      (req.body as UpdateRolePermissionInput).is_allowed,
      getAuthenticatedUser(req),
    );

    res
      .status(200)
      .json({ rolePermission: presentRolePermission(rolePermission) });
  };
}
