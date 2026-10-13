import type { Prisma } from '../../../generated/prisma/client.js';
import { presentMedia } from '../../media/presenters/media.presenter.js';

export type ClientRecord = Prisma.ClientGetPayload<{
  include: { media: true };
}>;

export function presentClient(client: ClientRecord) {
  return {
    id: client.id,
    name: client.name,
    media_id: client.mediaId,
    media: client.media ? presentMedia(client.media) : null,
    sort_order: client.sortOrder,
    created_at: client.createdAt.toISOString(),
    created_by: client.createdBy,
    updated_at: client.updatedAt?.toISOString() ?? null,
    updated_by: client.updatedBy,
  };
}
