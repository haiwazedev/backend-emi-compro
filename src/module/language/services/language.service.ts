import type { Language } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { LanguageRepository } from '../repositories/language.repository.js';

// Bahasa Indonesia: every article's first content.
export const DEFAULT_LANGUAGE_ID = 'id';

export class LanguageService {
  constructor(private readonly repository = new LanguageRepository()) {}

  listActive() {
    return this.repository.findActive();
  }

  async requireActive(id: string): Promise<Language> {
    const language = await this.repository.findById(id);

    if (!language || !language.isActive) {
      throw new ApiError(400, 'Language does not exist or is inactive.');
    }

    return language;
  }
}
