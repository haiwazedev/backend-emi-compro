import type { Language } from '../../../generated/prisma/client.js';

export function presentLanguage(language: Language) {
  return {
    id: language.id,
    language: language.language,
    abbreviated_language: language.abbreviatedLanguage,
    flag: language.flag,
    is_active: language.isActive,
  };
}
