import type { Request, Response } from 'express';
import { presentPermission } from '../presenters/role.presenter.js';
import { PermissionService } from '../services/permission.service.js';

export class PermissionController {
  constructor(private readonly service = new PermissionService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const permissions = await this.service.list();

    res.status(200).json({ permissions: permissions.map(presentPermission) });
  };
}
