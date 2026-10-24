import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { presentUser } from '../presenters/user.presenter.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
} from '../schemas/user.schema.js';
import { UserService } from '../services/user.service.js';

export class UserController {
  constructor(private readonly service = new UserService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const { users, pagination } = await this.service.list(
      res.locals.userListQuery as UserListQuery,
    );

    res.status(200).json({ users: users.map(presentUser), pagination });
  };

  count = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ total: await this.service.countAll() });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getById(parseIdParam(req.params.userId));

    res.status(200).json({ user: presentUser(user) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.create(
      req.body as CreateUserInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({ user: presentUser(user) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.update(
      parseIdParam(req.params.userId),
      req.body as UpdateUserInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ user: presentUser(user) });
  };

  resendInvite = async (req: Request, res: Response): Promise<void> => {
    await this.service.resendInvite(
      parseIdParam(req.params.userId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.userId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
