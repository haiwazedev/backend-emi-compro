import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
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
    const divisions = await this.service.list(query);

    res.status(200).json({ divisions: divisions.map(presentDivision) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const division = await this.service.getById(
      parseIdParam(req.params.divisionId),
    );

    res.status(200).json({ division: presentDivision(division) });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const divisions = await this.service.reorder(
      req.body as ReorderDivisionsInput,
    );

    res.status(200).json({ divisions: divisions.map(presentDivision) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const division = await this.service.create(
      req.body as CreateDivisionInput,
      getAuthenticatedUserName(req),
    );

    res.status(201).json({ division: presentDivision(division) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const division = await this.service.update(
      parseIdParam(req.params.divisionId),
      req.body as UpdateDivisionInput,
      getAuthenticatedUserName(req),
    );

    res.status(200).json({ division: presentDivision(division) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseIdParam(req.params.divisionId));
    res.status(204).end();
  };
}

function getAuthenticatedUserName(req: Request): string {
  if (!req.authenticatedUser) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return req.authenticatedUser.name;
}
