import type { Prisma } from '../../../generated/prisma/client.js';

export type ContentRecord = Prisma.ContentGetPayload<object>;

export function presentContent(content: ContentRecord) {
  return {
    id: content.id,
    page: content.page,
    block_key: content.blockKey,
    block_type: content.blockType,
    sort_order: content.sortOrder,
    data: content.data,
    media_id: content.mediaId,
    created_at: content.createdAt.toISOString(),
    created_by: content.createdBy,
    updated_at: content.updatedAt?.toISOString() ?? null,
    updated_by: content.updatedBy,
  };
}
