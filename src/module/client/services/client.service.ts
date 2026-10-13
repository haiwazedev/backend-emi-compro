import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ClientRepository } from '../repositories/client.repository.js';
import type {
  CreateClientInput,
  ReorderClientsInput,
  UpdateClientInput,
} from '../schemas/client.schema.js';
import {
  ClientLogoFileService,
  type ClientLogo,
} from './client-logo-file.service.js';

export class ClientService {
  constructor(
    private readonly repository = new ClientRepository(),
    private readonly logoFileService = new ClientLogoFileService(),
  ) {}

  list() {
    return this.repository.findMany();
  }

  async getById(id: number) {
    const client = await this.repository.findById(id);

    if (!client) {
      throw new ApiError(404, 'Client was not found.');
    }

    return client;
  }

  async reorder(input: ReorderClientsInput) {
    const clients = await this.repository.reorder(input.client_ids);

    if (!clients) {
      throw new ApiError(
        400,
        'client_ids must contain every existing client ID exactly once.',
      );
    }

    return clients;
  }

  async create(
    input: CreateClientInput,
    logoFile: Express.Multer.File | undefined,
    userName: string,
  ) {
    if (!logoFile) {
      throw new ApiError(400, 'logo is required.');
    }

    const createdBy = getAuditName(userName);
    const logo = await this.storeLogo(logoFile);

    try {
      return await this.repository.create({
        name: input.name,
        ...toLogoFields(logo),
        createdBy,
      });
    } catch (error) {
      await this.logoFileService.removeAfterCommit(logo.filepath);
      throw error;
    }
  }

  async update(
    id: number,
    input: UpdateClientInput,
    logoFile: Express.Multer.File | undefined,
    userName: string,
  ) {
    const current = await this.getById(id);

    if (Object.keys(input).length === 0 && !logoFile) {
      throw new ApiError(400, 'At least one client field is required.');
    }

    const data: Prisma.ClientUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
    };
    if (input.name !== undefined) data.name = input.name;

    const logo = logoFile ? await this.storeLogo(logoFile) : undefined;
    if (logo) Object.assign(data, toLogoFields(logo));

    let client;
    try {
      client = await this.repository.update(id, data);
    } catch (error) {
      if (logo) await this.logoFileService.removeAfterCommit(logo.filepath);
      throw mapClientError(error);
    }

    if (logo) {
      await this.logoFileService.removeAfterCommit(current.logoFilepath);
    }

    return client;
  }

  async delete(id: number): Promise<void> {
    const current = await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      throw mapClientError(error);
    }

    await this.logoFileService.removeAfterCommit(current.logoFilepath);
  }

  private storeLogo(file: Express.Multer.File): Promise<ClientLogo> {
    return this.logoFileService.store(file.originalname, file.buffer);
  }
}

function toLogoFields(logo: ClientLogo) {
  return {
    logoFilename: logo.filename,
    logoFilepath: logo.filepath,
    logoExtension: logo.extension,
    logoSize: logo.size,
    logoMetadata: logo.metadata,
  };
}

function mapClientError(error: unknown): unknown {
  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Client was not found.');
  }

  return error;
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
