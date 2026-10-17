import type { Language } from '../../../generated/prisma/client.js';

export function presentLanguage(language: Language) {
  return {
    id: language.id,
    language: language.language,
    flag: language.flag,
    sort_order: language.sortOrder,
    is_active: language.isActive,
  };
}
