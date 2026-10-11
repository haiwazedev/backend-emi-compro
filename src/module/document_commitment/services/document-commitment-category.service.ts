import { ApiError } from '../../../shared/errors/api-error.js';
import { DocumentCommitmentCategoryRepository } from '../repositories/document-commitment-category.repository.js';
import { DocumentCommitmentFileService } from './document-commitment-file.service.js';
import type {
  CreateDocumentCommitmentCategoryInput,
  UpdateDocumentCommitmentCategoryInput,
} from '../schemas/document-commitment-category.schema.js';

export class DocumentCommitmentCategoryService {
  constructor(
    private readonly repository = new DocumentCommitmentCategoryRepository(),
    private readonly fileService = new DocumentCommitmentFileService(),
  ) {}

  list() {
    return this.repository.findMany();
  }

  async getById(id: number) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new ApiError(404, 'Document commitment category was not found.');
    }

    return category;
  }

  create(input: CreateDocumentCommitmentCategoryInput) {
    return this.repository.create({ name: input.name });
  }

  async update(id: number, input: UpdateDocumentCommitmentCategoryInput) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one category field is required.');
    }

    try {
      return await this.repository.update(id, input);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Document commitment category was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const documents = await this.repository.deleteWithDocuments(id);

    if (!documents) {
      throw new ApiError(404, 'Document commitment category was not found.');
    }

    await Promise.all(
      documents.map(({ filename }) =>
        this.fileService.removeAfterCommit(filename),
      ),
    );
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
