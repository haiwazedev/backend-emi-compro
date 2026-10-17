import { JSDOM } from 'jsdom';
import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ArticleRepository } from '../repositories/article.repository.js';
import { ArticleCategoryRepository } from '../repositories/article-category.repository.js';
import { LanguageService } from '../../language/services/language.service.js';
import { MediaRepository } from '../../media/repositories/media.repository.js';
import type {
  ArticleListQuery,
  CreateArticleInput,
  UpdateArticleInput,
} from '../schemas/article.schema.js';

type ArticleContentInput = Pick<
  CreateArticleInput,
  'language_id' | 'title' | 'slug' | 'summary' | 'content' | 'status'
>;

export class ArticleService {
  constructor(
    private readonly repository = new ArticleRepository(),
    private readonly categoryRepository = new ArticleCategoryRepository(),
    private readonly mediaRepository = new MediaRepository(),
    private readonly languageService = new LanguageService(),
  ) {}

  async list(query: ArticleListQuery) {
    const [articles, totalItems, languages] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
      this.languageService.listActive(),
    ]);

    return {
      articles,
      languages,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  async getById(id: number) {
    const article = await this.repository.findById(id);

    if (!article) {
      throw new ApiError(404, 'Article was not found.');
    }

    return article;
  }

  async create(input: CreateArticleInput, userName: string) {
    const createdBy = getAuditName(userName);
    await this.requireCategory(input.article_category_id);
    await this.requirePictureMedia(input.primary_photo);
    await this.requireContentTarget(input);

    try {
      return await this.repository.create(
        { ...toCreateData(input), createdBy },
        toContentData(input),
      );
    } catch (error) {
      throw mapArticleError(error);
    }
  }

  async update(id: number, input: UpdateArticleInput, userName: string) {
    const updatedBy = getAuditName(userName);
    await this.getById(id);

    if (input.article_category_id !== undefined) {
      await this.requireCategory(input.article_category_id);
    }

    if (input.primary_photo !== undefined && input.primary_photo !== null) {
      await this.requirePictureMedia(input.primary_photo);
    }

    await this.requireContentTarget(input, id);

    try {
      return await this.repository.updateWithContent(
        id,
        toUpdateData(input, updatedBy),
        toContentData(input),
        updatedBy,
      );
    } catch (error) {
      throw mapArticleError(error);
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      throw mapArticleError(error);
    }
  }

  private async requireCategory(id: number): Promise<void> {
    if (!(await this.categoryRepository.findById(id))) {
      throw new ApiError(400, 'Article category does not exist.');
    }
  }

  private async requirePictureMedia(id: number): Promise<void> {
    const media = await this.mediaRepository.findById(id);

    if (!media || media.type !== 'PICTURE') {
      throw new ApiError(
        400,
        'Primary photo must reference an existing picture media item.',
      );
    }
  }

  // Active language, and a slug not used by another article in that language.
  private async requireContentTarget(
    input: ArticleContentInput,
    articleId?: number,
  ): Promise<void> {
    await this.languageService.requireActive(input.language_id);
    const existing = await this.repository.findContentBySlug(
      input.language_id,
      input.slug,
    );

    if (existing && existing.articleId !== articleId) {
      throw new ApiError(409, SLUG_CONFLICT_MESSAGE);
    }
  }
}

const SLUG_CONFLICT_MESSAGE =
  'Article slug is already in use for this language.';

function toCreateData(
  input: CreateArticleInput,
): Omit<Prisma.ArticleUncheckedCreateInput, 'createdBy' | 'contents'> {
  return {
    articleCategoryId: input.article_category_id,
    issueDate: input.issue_date ?? null,
    pressReleaseNumber: input.press_release_number ?? null,
    primaryPhotoMediaId: input.primary_photo,
    cpName: input.cp_name ?? null,
    cpRole: input.cp_role ?? null,
    cpPhoneNumber: input.cp_phone_number ?? null,
    cpEmail: input.cp_email ?? null,
  };
}

function toContentData(input: ArticleContentInput) {
  return {
    languageId: input.language_id,
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    status: input.status,
    readTime: calculateReadTime(input.content),
  };
}

// Trauzettel-Klosinski & Dietz (2012): ~1000 chars/min, stable across 17 languages.
const READ_CHARACTERS_PER_MINUTE = 1000;

// Whole minutes for the visible body text, at least 1.
export function calculateReadTime(html: string): number {
  const text = new JSDOM(html).window.document.body.textContent ?? '';
  const length = text.replace(/\s+/g, ' ').trim().length;

  return Math.max(1, Math.ceil(length / READ_CHARACTERS_PER_MINUTE));
}

function toUpdateData(
  input: UpdateArticleInput,
  updatedBy: string,
): Omit<Prisma.ArticleUncheckedUpdateInput, 'contents'> {
  const data: Omit<Prisma.ArticleUncheckedUpdateInput, 'contents'> = {
    updatedBy,
    updatedAt: new Date(),
  };

  if (input.article_category_id !== undefined) {
    data.articleCategoryId = input.article_category_id;
  }
  if (input.issue_date !== undefined) data.issueDate = input.issue_date;
  if (input.press_release_number !== undefined) {
    data.pressReleaseNumber = input.press_release_number;
  }
  if (input.primary_photo !== undefined) {
    data.primaryPhotoMediaId = input.primary_photo;
  }
  if (input.cp_name !== undefined) data.cpName = input.cp_name;
  if (input.cp_role !== undefined) data.cpRole = input.cp_role;
  if (input.cp_phone_number !== undefined) {
    data.cpPhoneNumber = input.cp_phone_number;
  }
  if (input.cp_email !== undefined) data.cpEmail = input.cp_email;

  return data;
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function mapArticleError(error: unknown): unknown {
  if (isPrismaError(error, 'P2002')) {
    return new ApiError(409, SLUG_CONFLICT_MESSAGE);
  }

  if (isPrismaError(error, 'P2003')) {
    return new ApiError(
      400,
      'Article category, primary photo media, or language does not exist.',
    );
  }

  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Article was not found.');
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
