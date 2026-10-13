import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { MediaRepository } from '../../media/repositories/media.repository.js';
import { ClientRepository } from '../repositories/client.repository.js';
import type {
  CreateClientInput,
  ReorderClientsInput,
  UpdateClientInput,
} from '../schemas/client.schema.js';

export class ClientService {
  constructor(
    private readonly repository = new ClientRepository(),
    private readonly mediaRepository = new MediaRepository(),
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

  async create(input: CreateClientInput, userName: string) {
    await this.requirePictureMedia(input.media_id);

    return this.repository.create({
      name: input.name,
      mediaId: input.media_id ?? null,
      createdBy: getAuditName(userName),
    });
  }

  async update(id: number, input: UpdateClientInput, userName: string) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one client field is required.');
    }

    await this.requirePictureMedia(input.media_id);

    const data: Prisma.ClientUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
    };

    if (input.name !== undefined) data.name = input.name;
    if (input.media_id !== undefined) data.mediaId = input.media_id;

    try {
      return await this.repository.update(id, data);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Client was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Client was not found.');
      }

      throw error;
    }
  }

  private async requirePictureMedia(id: number | null | undefined) {
    if (id === undefined || id === null) return;

    const media = await this.mediaRepository.findById(id);

    if (!media || media.type !== 'PICTURE') {
      throw new ApiError(
        400,
        'media_id must reference an existing picture media item.',
      );
    }
  }
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
