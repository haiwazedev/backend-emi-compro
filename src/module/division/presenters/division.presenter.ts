import type { Prisma } from '../../../generated/prisma/client.js';

export type DivisionWithContents = Prisma.DivisionGetPayload<{
  include: { contents: true };
}>;

export function presentDivision(division: DivisionWithContents) {
  return {
    id: division.id,
    icon_svg: division.iconSvg,
    status: division.status,
    sort_order: division.sortOrder,
    created_at: division.createdAt.toISOString(),
    created_by: division.createdBy,
    updated_at: division.updatedAt?.toISOString() ?? null,
    updated_by: division.updatedBy,
    contents: division.contents.map((content) => ({
      language_id: content.languageId,
      name: content.name,
      abbr: content.abbr,
      description: content.description,
    })),
  };
}
