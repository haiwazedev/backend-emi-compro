import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { presentRole } from '../presenters/role.presenter.js';
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from '../schemas/role.schema.js';
import { RoleService } from '../services/role.service.js';

export class RoleController {
  constructor(private readonly service = new RoleService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const roles = await this.service.list();

    res.status(200).json({ roles: roles.map(presentRole) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const role = await this.service.getById(parseIdParam(req.params.roleId));

    res.status(200).json({ role: presentRole(role) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const role = await this.service.create(
      req.body as CreateRoleInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({ role: presentRole(role) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const role = await this.service.update(
      parseIdParam(req.params.roleId),
      req.body as UpdateRoleInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ role: presentRole(role) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.roleId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
