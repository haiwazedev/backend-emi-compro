import { ApiError } from '../../../shared/errors/api-error.js';
import { ArticleCategoryRepository } from '../repositories/article-category.repository.js';
import type {
  CreateArticleCategoryInput,
  UpdateArticleCategoryInput,
} from '../schemas/article-category.schema.js';

export class ArticleCategoryService {
  constructor(private readonly repository = new ArticleCategoryRepository()) {}

  list() {
    return this.repository.findMany();
  }

  async getById(id: number) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new ApiError(404, 'Article category was not found.');
    }

    return category;
  }

  async create(input: CreateArticleCategoryInput) {
    if (await this.repository.findBySlug(input.slug)) {
      throw new ApiError(409, 'Article category slug is already in use.');
    }

    try {
      return await this.repository.create(input);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(409, 'Article category slug is already in use.');
      }

      throw error;
    }
  }

  async update(id: number, input: UpdateArticleCategoryInput) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one category field is required.');
    }

    if (input.slug) {
      const existing = await this.repository.findBySlug(input.slug);

      if (existing && existing.id !== id) {
        throw new ApiError(409, 'Article category slug is already in use.');
      }
    }

    try {
      return await this.repository.update(id, input);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(409, 'Article category slug is already in use.');
      }

      if (isRecordNotFoundError(error)) {
        throw new ApiError(404, 'Article category was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiError(404, 'Article category was not found.');
      }

      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaError(error, 'P2002');
}

function isRecordNotFoundError(error: unknown): boolean {
  return isPrismaError(error, 'P2025');
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
