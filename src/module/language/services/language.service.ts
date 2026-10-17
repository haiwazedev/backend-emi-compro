import type { Language } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { LanguageRepository } from '../repositories/language.repository.js';

export class LanguageService {
  constructor(private readonly repository = new LanguageRepository()) {}

  listActive() {
    return this.repository.findActive();
  }

  async requireActive(id: number) {
    return assertActive(await this.repository.findById(id));
  }

  async requireActiveByAbbreviation(abbreviatedLanguage: string) {
    return assertActive(
      await this.repository.findByAbbreviation(abbreviatedLanguage),
    );
  }
}

function assertActive(language: Language | null) {
  if (!language || !language.isActive) {
    throw new ApiError(400, 'Language does not exist or is inactive.');
  }

  return language;
}
