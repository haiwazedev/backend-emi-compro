import type { Prisma } from '../../../generated/prisma/client.js';
import { presentDivision } from '../../division/presenters/division.presenter.js';
import { presentMedia } from '../../media/presenters/media.presenter.js';

export type ServiceWithRelations = Prisma.ServiceGetPayload<{
  include: {
    contents: true;
    division: { include: { contents: true } };
    mediaLinks: { include: { media: true; contents: true } };
  };
}>;

export function presentService(service: ServiceWithRelations) {
  return {
    id: service.id,
    division_id: service.divisionId,
    sort_order: service.sortOrder,
    created_at: service.createdAt.toISOString(),
    created_by: service.createdBy,
    updated_at: service.updatedAt?.toISOString() ?? null,
    updated_by: service.updatedBy,
    contents: service.contents.map((content) => ({
      language_id: content.languageId,
      name: content.name,
    })),
    media: service.mediaLinks.map(({ media, contents }) => ({
      ...presentMedia(media),
      contents: contents.map((content) => ({
        language_id: content.languageId,
        description: content.description,
      })),
    })),
    division: presentDivision(service.division),
  };
}
