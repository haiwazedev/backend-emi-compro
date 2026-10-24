import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
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
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  async list(query: FaqListQuery, includeDrafts: boolean) {
    const [faqs, languages] = await Promise.all([
      this.repository.findMany(query, includeDrafts),
      this.languageService.listActive(),
    ]);

    return { faqs, languages };
  }

  async getById(id: number, includeDrafts = true) {
    const faq = await this.repository.findById(id, includeDrafts);

    if (!faq) {
      throw new ApiError(404, 'FAQ was not found.');
    }

    return faq;
  }

  async reorder(input: ReorderFaqsInput, user: AuthenticatedUser) {
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

    await this.activityLogService.log(user, 'REORDER', 'FAQ');
    return { faqs, languages };
  }

  async create(input: FaqContentInput, user: AuthenticatedUser) {
    const createdBy = getAuditName(user.name);
    requireDefaultLanguageFirst(input.language_id, []);
    await this.languageService.requireActive(input.language_id);

    const faq = await this.repository.create(toContentData(input), createdBy);
    await this.activityLogService.log(user, 'CREATE', 'FAQ', input.question);
    return faq;
  }

  async update(id: number, input: FaqContentInput, user: AuthenticatedUser) {
    const updatedBy = getAuditName(user.name);
    const faq = await this.getById(id);
    requireDefaultLanguageFirst(input.language_id, faq.contents);
    await this.languageService.requireActive(input.language_id);

    try {
      const updated = await this.repository.updateWithContent(
        id,
        toContentData(input),
        updatedBy,
      );
      await this.activityLogService.log(user, 'UPDATE', 'FAQ', input.question);
      return updated;
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'FAQ was not found.');
      }

      throw error;
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const faq = await this.getById(id);

    try {
      await this.repository.delete(id);
      // Contents are ordered by language, so the first is the default question.
      await this.activityLogService.log(
        user,
        'DELETE',
        'FAQ',
        faq.contents[0]?.question ?? `#${id}`,
      );
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
