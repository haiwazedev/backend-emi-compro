import { ApiError } from '../../../shared/errors/api-error.js';
import { LanguageRepository } from '../repositories/language.repository.js';

export class LanguageService {
  constructor(private readonly repository = new LanguageRepository()) {}

  listActive() {
    return this.repository.findActive();
  }

  async requireActive(id: number) {
    const language = await this.repository.findById(id);

    if (!language || !language.isActive) {
      throw new ApiError(400, 'Language does not exist or is inactive.');
    }

    return language;
  }
}
