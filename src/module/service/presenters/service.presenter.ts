import type { Prisma } from '../../../generated/prisma/client.js';
import { presentDivision } from '../../division/presenters/division.presenter.js';

export type ServiceWithDivision = Prisma.ServiceGetPayload<{
  include: { division: true };
}>;

export function presentService(service: ServiceWithDivision) {
  return {
    id: service.id,
    division_id: service.divisionId,
    name: service.name,
    sort_order: service.sortOrder,
    created_at: service.createdAt.toISOString(),
    created_by: service.createdBy,
    updated_at: service.updatedAt?.toISOString() ?? null,
    updated_by: service.updatedBy,
    division: presentDivision(service.division),
  };
}
