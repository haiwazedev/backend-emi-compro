import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentService } from '../presenters/service.presenter.js';
import { ServiceService } from '../services/service.service.js';
import type {
  CreateServiceInput,
  ReorderServicesInput,
  UpdateServiceInput,
} from '../schemas/service.schema.js';

export class ServiceController {
  constructor(private readonly service = new ServiceService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const services = await this.service.list();

    res.status(200).json({ services: services.map(presentService) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const service = await this.service.getById(
      parseIdParam(req.params.serviceId),
    );

    res.status(200).json({ service: presentService(service) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const service = await this.service.create(
      req.body as CreateServiceInput,
      getAuthenticatedUserName(req),
    );

    res.status(201).json({ service: presentService(service) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const service = await this.service.update(
      parseIdParam(req.params.serviceId),
      req.body as UpdateServiceInput,
      getAuthenticatedUserName(req),
    );

    res.status(200).json({ service: presentService(service) });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const services = await this.service.reorder(
      req.body as ReorderServicesInput,
    );

    res.status(200).json({ services: services.map(presentService) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseIdParam(req.params.serviceId));
    res.status(204).end();
  };
}

function getAuthenticatedUserName(req: Request): string {
  if (!req.authenticatedUser) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return req.authenticatedUser.name;
}
