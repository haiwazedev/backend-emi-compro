import type { Prisma } from '../../../generated/prisma/client.js';
import { presentDivision } from '../../division/presenters/division.presenter.js';
import { presentMedia } from '../../media/presenters/media.presenter.js';

export type ServiceWithRelations = Prisma.ServiceGetPayload<{
  include: {
    division: true;
    mediaLinks: { include: { media: true } };
  };
}>;

export function presentService(service: ServiceWithRelations) {
  return {
    id: service.id,
    division_id: service.divisionId,
    name: service.name,
    description: service.description,
    sort_order: service.sortOrder,
    created_at: service.createdAt.toISOString(),
    created_by: service.createdBy,
    updated_at: service.updatedAt?.toISOString() ?? null,
    updated_by: service.updatedBy,
    media: service.mediaLinks.map(({ media }) => presentMedia(media)),
    division: presentDivision(service.division),
  };
}
