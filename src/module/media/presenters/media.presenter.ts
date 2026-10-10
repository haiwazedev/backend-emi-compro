import type { Prisma } from '../../../generated/prisma/client.js';

export type MediaRecord = Prisma.MediaGetPayload<object>;

export function presentMedia(media: MediaRecord) {
  return {
    id: media.id,
    filename: media.filename,
    path: media.path,
    extension: media.extension,
    type: media.type,
    size: media.size,
    metadata: media.metadata,
    created_by: media.createdBy,
    created_at: media.createdAt.toISOString(),
  };
}
