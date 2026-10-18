import type { SiteContentItemRecord } from '../repositories/site-content.repository.js';

export function presentSiteContents({
  languageId,
  items,
}: {
  languageId: string;
  items: SiteContentItemRecord[];
}) {
  return {
    language_id: languageId,
    items: items.map(presentSiteContentItem),
  };
}

function presentSiteContentItem(item: SiteContentItemRecord) {
  return {
    id: item.id,
    site_content_id: item.siteContentId,
    page: item.siteContent.page,
    block_key: item.siteContent.blockKey,
    block_type: item.siteContent.blockType,
    sort_order: item.sortOrder,
    data: item.data,
    created_at: item.createdAt.toISOString(),
    created_by: item.createdBy,
    updated_at: item.updatedAt?.toISOString() ?? null,
    updated_by: item.updatedBy,
  };
}
