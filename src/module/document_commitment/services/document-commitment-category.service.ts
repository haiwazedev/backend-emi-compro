import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import {
  DEFAULT_LANGUAGE_ID,
  LanguageService,
} from '../../language/services/language.service.js';
import { DocumentCommitmentCategoryRepository } from '../repositories/document-commitment-category.repository.js';
import { DocumentCommitmentFileService } from './document-commitment-file.service.js';
import type {
  CreateDocumentCommitmentCategoryInput,
  DocumentCommitmentCategoryListQuery,
  UpdateDocumentCommitmentCategoryInput,
} from '../schemas/document-commitment-category.schema.js';

export class DocumentCommitmentCategoryService {
  constructor(
    private readonly repository = new DocumentCommitmentCategoryRepository(),
    private readonly fileService = new DocumentCommitmentFileService(),
    private readonly activityLogService = new ActivityLogService(),
    private readonly languageService = new LanguageService(),
  ) {}

  async list(query: DocumentCommitmentCategoryListQuery) {
    const categories = await this.repository.findMany(query);
    const selectedName = (category: (typeof categories)[number]) =>
      (query.language_id
        ? category.contents.find(
            (content) => content.languageId === query.language_id,
          )?.name
        : undefined) ??
      category.contents[0]?.name ??
      '';

    return categories.sort(
      (left, right) =>
        selectedName(left).localeCompare(
          selectedName(right),
          query.language_id ?? DEFAULT_LANGUAGE_ID,
        ) || left.id - right.id,
    );
  }

  async getById(id: number) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new ApiError(404, 'Document commitment category was not found.');
    }

    return category;
  }

  async create(
    input: CreateDocumentCommitmentCategoryInput,
    user: AuthenticatedUser,
  ) {
    requireDefaultLanguageFirst(input.language_id, []);
    await this.languageService.requireActive(input.language_id);
    await this.requireSlugAvailable(input.slug, input.language_id);

    try {
      const category = await this.repository.create({
        languageId: input.language_id,
        name: input.name,
        slug: input.slug,
        description: input.description,
      });
      await this.activityLogService.log(
        user,
        'CREATE',
        'DOCUMENT_COMMITMENT_CATEGORY',
        input.name,
      );
      return category;
    } catch (error) {
      throw mapCategoryError(error);
    }
  }

  async update(
    id: number,
    input: UpdateDocumentCommitmentCategoryInput,
    user: AuthenticatedUser,
  ) {
    const current = await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one category field is required.');
    }

    const languageId = input.language_id;
    if (!languageId) {
      throw new ApiError(
        400,
        'language_id is required when updating translated fields.',
      );
    }

    await this.languageService.requireActive(languageId);
    requireDefaultLanguageFirst(languageId, current.contents);

    const existingContent = current.contents.find(
      (content) => content.languageId === languageId,
    );
    if (
      !existingContent &&
      (input.name === undefined || input.slug === undefined)
    ) {
      throw new ApiError(
        400,
        'name and slug are required when adding a category translation.',
      );
    }

    if (input.slug !== undefined) {
      await this.requireSlugAvailable(input.slug, languageId, id);
    }

    try {
      const category = await this.repository.updateWithContent(id, {
        languageId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      });
      await this.activityLogService.log(
        user,
        'UPDATE',
        'DOCUMENT_COMMITMENT_CATEGORY',
        input.name ??
          existingContent?.name ??
          current.contents[0]?.name ??
          `#${id}`,
      );
      return category;
    } catch (error) {
      throw mapCategoryError(error);
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const category = await this.getById(id);
    const documents = await this.repository.deleteWithDocuments(id);

    if (!documents) {
      throw new ApiError(404, 'Document commitment category was not found.');
    }

    await Promise.all(
      documents.map(({ filename }) =>
        this.fileService.removeAfterCommit(filename),
      ),
    );
    await this.activityLogService.log(
      user,
      'DELETE',
      'DOCUMENT_COMMITMENT_CATEGORY',
      category.contents[0]?.name ?? `#${id}`,
    );
  }

  private async requireSlugAvailable(
    slug: string,
    languageId: string,
    categoryId?: number,
  ): Promise<void> {
    const existing = await this.repository.findBySlug(slug, languageId);

    if (existing && existing.documentCommitmentCategoryId !== categoryId) {
      throw new ApiError(
        409,
        'Document commitment category slug is already in use for this language.',
      );
    }
  }
}

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

function mapCategoryError(error: unknown): unknown {
  if (isPrismaError(error, 'P2002')) {
    return new ApiError(
      409,
      'Document commitment category slug is already in use for this language.',
    );
  }

  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Document commitment category was not found.');
  }

  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
