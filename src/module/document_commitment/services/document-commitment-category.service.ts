import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
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
    private readonly activityLogService = new ActivityLogService(),
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

  async create(
    input: CreateDocumentCommitmentCategoryInput,
    user: AuthenticatedUser,
  ) {
    const category = await this.repository.create({ name: input.name });
    await this.activityLogService.log(
      user,
      'CREATE',
      'DOCUMENT_COMMITMENT_CATEGORY',
      category.name,
    );
    return category;
  }

  async update(
    id: number,
    input: UpdateDocumentCommitmentCategoryInput,
    user: AuthenticatedUser,
  ) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'At least one category field is required.');
    }

    try {
      const category = await this.repository.update(id, input);
      await this.activityLogService.log(
        user,
        'UPDATE',
        'DOCUMENT_COMMITMENT_CATEGORY',
        category.name,
      );
      return category;
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Document commitment category was not found.');
      }

      throw error;
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
      category.name,
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
