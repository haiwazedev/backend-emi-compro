import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentClient } from '../presenters/client.presenter.js';
import { ClientService } from '../services/client.service.js';
import type {
  CreateClientInput,
  ReorderClientsInput,
  UpdateClientInput,
} from '../schemas/client.schema.js';

export class ClientController {
  constructor(private readonly service = new ClientService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const clients = await this.service.list();

    res.status(200).json({ clients: clients.map(presentClient) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const client = await this.service.getById(
      parseIdParam(req.params.clientId),
    );

    res.status(200).json({ client: presentClient(client) });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const clients = await this.service.reorder(req.body as ReorderClientsInput);

    res.status(200).json({ clients: clients.map(presentClient) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const client = await this.service.create(
      req.body as CreateClientInput,
      getAuthenticatedUserName(req),
    );

    res.status(201).json({ client: presentClient(client) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const client = await this.service.update(
      parseIdParam(req.params.clientId),
      req.body as UpdateClientInput,
      getAuthenticatedUserName(req),
    );

    res.status(200).json({ client: presentClient(client) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseIdParam(req.params.clientId));
    res.status(204).end();
  };
}

function getAuthenticatedUserName(req: Request): string {
  if (!req.authenticatedUser) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return req.authenticatedUser.name;
}
