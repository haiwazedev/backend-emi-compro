import { ApiError } from '../../../shared/errors/api-error.js';
import {
  DEFAULT_LANGUAGE_ID,
  LanguageService,
} from '../../language/services/language.service.js';
import { FaqRepository } from '../repositories/faq.repository.js';
import type {
  FaqContentInput,
  FaqListQuery,
  ReorderFaqsInput,
} from '../schemas/faq.schema.js';

export class FaqService {
  constructor(
    private readonly repository = new FaqRepository(),
    private readonly languageService = new LanguageService(),
  ) {}

  async list(query: FaqListQuery) {
    const [faqs, languages] = await Promise.all([
      this.repository.findMany(query),
      this.languageService.listActive(),
    ]);

    return { faqs, languages };
  }

  async getById(id: number) {
    const faq = await this.repository.findById(id);

    if (!faq) {
      throw new ApiError(404, 'FAQ was not found.');
    }

    return faq;
  }

  async reorder(input: ReorderFaqsInput) {
    const [faqs, languages] = await Promise.all([
      this.repository.reorder(input.faq_ids),
      this.languageService.listActive(),
    ]);

    if (!faqs) {
      throw new ApiError(
        400,
        'faq_ids must contain every existing FAQ ID exactly once.',
      );
    }

    return { faqs, languages };
  }

  async create(input: FaqContentInput, userName: string) {
    const createdBy = getAuditName(userName);
    requireDefaultLanguageFirst(input.language_id, []);
    await this.languageService.requireActive(input.language_id);

    return this.repository.create(toContentData(input), createdBy);
  }

  async update(id: number, input: FaqContentInput, userName: string) {
    const updatedBy = getAuditName(userName);
    const faq = await this.getById(id);
    requireDefaultLanguageFirst(input.language_id, faq.contents);
    await this.languageService.requireActive(input.language_id);

    try {
      return await this.repository.updateWithContent(
        id,
        toContentData(input),
        updatedBy,
      );
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'FAQ was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'FAQ was not found.');
      }

      throw error;
    }
  }
}

// Other languages need a saved (draft or published) Bahasa Indonesia content first.
function requireDefaultLanguageFirst(
  languageId: string,
  contents: { languageId: string }[],
): void {
  const hasDefault = contents.some(
    (content) => content.languageId === DEFAULT_LANGUAGE_ID,
  );

  if (languageId !== DEFAULT_LANGUAGE_ID && !hasDefault) {
    throw new ApiError(
      400,
      'Bahasa Indonesia is required before adding another language.',
    );
  }
}

function toContentData(input: FaqContentInput) {
  return {
    languageId: input.language_id,
    question: input.question,
    answer: input.answer,
    status: input.status,
  };
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
