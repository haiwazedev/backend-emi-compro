import { Prisma } from '../../../generated/prisma/client.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { ArticleRepository } from '../repositories/article.repository.js';
import { ArticleCategoryRepository } from '../repositories/article-category.repository.js';
import { MediaRepository } from '../../media/repositories/media.repository.js';
import type {
  ArticleListQuery,
  CreateArticleInput,
  UpdateArticleInput,
} from '../schemas/article.schema.js';

export class ArticleService {
  constructor(
    private readonly repository = new ArticleRepository(),
    private readonly categoryRepository = new ArticleCategoryRepository(),
    private readonly mediaRepository = new MediaRepository(),
  ) {}

  async list(query: ArticleListQuery) {
    const [articles, totalItems] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    return {
      articles,
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

    if (await this.repository.findBySlug(input.slug)) {
      throw new ApiError(409, 'Article slug is already in use.');
    }

    try {
      return await this.repository.create({
        ...toCreateData(input),
        createdBy,
      });
    } catch (error) {
      throw mapArticleError(error);
    }
  }

  async update(id: number, input: UpdateArticleInput, userName: string) {
    const current = await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one article field is required.');
    }

    if (input.article_category_id !== undefined) {
      await this.requireCategory(input.article_category_id);
    }

    if (input.primary_photo !== undefined && input.primary_photo !== null) {
      await this.requirePictureMedia(input.primary_photo);
    }

    if (input.slug && input.slug !== current.slug) {
      const existing = await this.repository.findBySlug(input.slug);

      if (existing && existing.id !== id) {
        throw new ApiError(409, 'Article slug is already in use.');
      }
    }

    try {
      return await this.repository.update(
        id,
        toUpdateData(input, getAuditName(userName)),
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
}

function toCreateData(
  input: CreateArticleInput,
): Omit<Prisma.ArticleUncheckedCreateInput, 'createdBy'> {
  return {
    articleCategoryId: input.article_category_id,
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    issueDate: input.issue_date ?? null,
    pressReleaseNumber: input.press_release_number ?? null,
    primaryPhotoMediaId: input.primary_photo,
    cpName: input.cp_name ?? null,
    cpRole: input.cp_role ?? null,
    cpPhoneNumber: input.cp_phone_number ?? null,
    cpEmail: input.cp_email ?? null,
    status: input.status ?? 'DRAFT',
  };
}

function toUpdateData(
  input: UpdateArticleInput,
  updatedBy: string,
): Prisma.ArticleUncheckedUpdateInput {
  const data: Prisma.ArticleUncheckedUpdateInput = {
    updatedBy,
    updatedAt: new Date(),
  };

  if (input.article_category_id !== undefined) {
    data.articleCategoryId = input.article_category_id;
  }
  if (input.title !== undefined) data.title = input.title;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.summary !== undefined) data.summary = input.summary;
  if (input.content !== undefined) data.content = input.content;
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
  if (input.status !== undefined) data.status = input.status;

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
    return new ApiError(409, 'Article slug is already in use.');
  }

  if (isPrismaError(error, 'P2003')) {
    return new ApiError(
      400,
      'Article category or primary photo media does not exist.',
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
