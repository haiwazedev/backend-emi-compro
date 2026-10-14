import type { Client } from '../../../generated/prisma/client.js';

export function presentClient(client: Client) {
  return {
    id: client.id,
    name: client.name,
    logo_filename: client.logoFilename,
    logo_filepath: client.logoFilepath,
    logo_extension: client.logoExtension,
    logo_size: client.logoSize,
    logo_metadata: client.logoMetadata,
    sort_order: client.sortOrder,
    created_at: client.createdAt.toISOString(),
    created_by: client.createdBy,
    updated_at: client.updatedAt?.toISOString() ?? null,
    updated_by: client.updatedBy,
  };
}
