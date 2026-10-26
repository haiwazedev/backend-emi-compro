import type { Prisma } from '../../../generated/prisma/client.js';
import { sanitizeSvgMarkupOrNull } from '../../../shared/files/svg-file.js';

export type DivisionWithContents = Prisma.DivisionGetPayload<{
  include: { contents: true };
}>;

export function presentDivision(division: DivisionWithContents) {
  return {
    id: division.id,
    icon_svg: sanitizeSvgMarkupOrNull(division.iconSvg),
    status: division.status,
    sort_order: division.sortOrder,
    created_at: division.createdAt.toISOString(),
    created_by: division.createdBy,
    updated_at: division.updatedAt?.toISOString() ?? null,
    updated_by: division.updatedBy,
    contents: division.contents.map((content) => ({
      language_id: content.languageId,
      name: content.name,
      slug: content.slug,
      abbr: content.abbr,
      description: content.description,
    })),
  };
}
