import type { Request, Response } from 'express';
import { canSeeDrafts } from '../../auth/auth.middleware.js';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentDivision } from '../presenters/division.presenter.js';
import { DivisionService } from '../services/division.service.js';
import type {
  CreateDivisionInput,
  DivisionListQuery,
  ReorderDivisionsInput,
  UpdateDivisionInput,
} from '../schemas/division.schema.js';

export class DivisionController {
  constructor(private readonly service = new DivisionService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.divisionListQuery as DivisionListQuery;
    const divisions = await this.service.list(query, canSeeDrafts(res));

    res.status(200).json({ divisions: divisions.map(presentDivision) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const division = await this.service.getById(
      parseIdParam(req.params.divisionId),
      canSeeDrafts(res),
    );

    res.status(200).json({ division: presentDivision(division) });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const divisions = await this.service.reorder(
      req.body as ReorderDivisionsInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ divisions: divisions.map(presentDivision) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const division = await this.service.create(
      req.body as CreateDivisionInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({ division: presentDivision(division) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const division = await this.service.update(
      parseIdParam(req.params.divisionId),
      req.body as UpdateDivisionInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ division: presentDivision(division) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.divisionId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
