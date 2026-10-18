import type { Division } from '../../../generated/prisma/client.js';

export function presentDivision(division: Division) {
  return {
    id: division.id,
    name: division.name,
    abbr: division.abbr,
    icon_svg: division.iconSvg,
    description: division.description,
    status: division.status,
    sort_order: division.sortOrder,
    created_at: division.createdAt.toISOString(),
    created_by: division.createdBy,
    updated_at: division.updatedAt?.toISOString() ?? null,
    updated_by: division.updatedBy,
  };
}
