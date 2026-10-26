import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { logger } from '../../../shared/logging/logger.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import {
  DEFAULT_LANGUAGE_ID,
  LanguageService,
} from '../../language/services/language.service.js';
import { DocumentCommitmentCategoryRepository } from '../repositories/document-commitment-category.repository.js';
import { DocumentCommitmentRepository } from '../repositories/document-commitment.repository.js';
import type {
  CreateDocumentCommitmentInput,
  DocumentCommitmentListQuery,
  UpdateDocumentCommitmentInput,
} from '../schemas/document-commitment.schema.js';
import {
  DocumentCommitmentFileService,
  type FileReplacement,
} from './document-commitment-file.service.js';

export class DocumentCommitmentService {
  constructor(
    private readonly repository = new DocumentCommitmentRepository(),
    private readonly categoryRepository = new DocumentCommitmentCategoryRepository(),
    private readonly fileService = new DocumentCommitmentFileService(),
    private readonly activityLogService = new ActivityLogService(),
    private readonly languageService = new LanguageService(),
  ) {}

  async list(query: DocumentCommitmentListQuery, includeDrafts: boolean) {
    const [documents, totalItems] = await Promise.all([
      this.repository.findMany(query, includeDrafts),
      this.repository.count(query, includeDrafts),
    ]);

    return {
      documents,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  async getById(id: number, includeDrafts = true) {
    const document = includeDrafts
      ? await this.repository.findById(id)
      : await this.repository.findPublishedById(id);

    if (!document) {
      throw new ApiError(404, 'Document commitment was not found.');
    }

    return document;
  }

  async create(
    input: CreateDocumentCommitmentInput,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    const uploadedBy = getAuditName(user.name);

    if (!file) {
      throw new ApiError(400, 'File is required.');
    }

    const details = this.fileService.describeUpload(file);
    await this.requireCategory(input.document_commitment_category_id);
    requireDefaultLanguageFirst(input.language_id, []);
    await this.languageService.requireActive(input.language_id);

    let fileStored = false;
    try {
      const document = await prisma.$transaction(async (transaction) => {
        const created = await this.repository.create(
          {
            documentCommitmentCategoryId: input.document_commitment_category_id,
            filePath: details.filePath,
            filename: details.filename,
            size: details.size,
            status: input.status ?? 'DRAFT',
            uploadedBy,
          },
          { languageId: input.language_id, title: input.title },
          transaction,
        );

        await this.fileService.store(details.filename, file.buffer);
        fileStored = true;

        return created;
      });

      await this.activityLogService.log(
        user,
        'CREATE',
        'DOCUMENT_COMMITMENT',
        input.title,
      );
      return document;
    } catch (error) {
      if (fileStored) {
        await this.fileService.removeAfterCommit(details.filename);
      }

      throw mapDocumentCommitmentError(error);
    }
  }

  async update(
    id: number,
    input: UpdateDocumentCommitmentInput,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    const current = await this.getById(id);
    const updatedBy = getAuditName(user.name);

    if (Object.keys(input).length === 0 && !file) {
      throw new ApiError(
        400,
        'At least one document field or file is required.',
      );
    }

    if (input.document_commitment_category_id !== undefined) {
      await this.requireCategory(input.document_commitment_category_id);
    }

    if (input.language_id !== undefined) {
      requireDefaultLanguageFirst(input.language_id, current.contents);
      await this.languageService.requireActive(input.language_id);
    }

    const fileDetails = file
      ? this.fileService.describeUpload(file)
      : undefined;
    const data: Prisma.DocumentCommitmentUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy,
    };

    if (input.document_commitment_category_id !== undefined) {
      data.documentCommitmentCategoryId = input.document_commitment_category_id;
    }
    if (input.status !== undefined) data.status = input.status;
    if (fileDetails) {
      data.filePath = fileDetails.filePath;
      data.filename = fileDetails.filename;
      data.size = fileDetails.size;
    }

    let replacement: FileReplacement | undefined;
    try {
      const document = await prisma.$transaction(async (transaction) => {
        const updated = await this.repository.updateWithContent(
          id,
          data,
          input.language_id && input.title !== undefined
            ? { languageId: input.language_id, title: input.title }
            : undefined,
          transaction,
        );

        if (file && fileDetails) {
          replacement = await this.fileService.replace(
            current.filename,
            fileDetails.filename,
            file.buffer,
          );
        }

        return updated;
      });

      if (replacement) {
        await replacement.commitAfterTransaction();
      }

      await this.activityLogService.log(
        user,
        'UPDATE',
        'DOCUMENT_COMMITMENT',
        input.title ?? current.contents[0]?.title ?? `#${id}`,
      );
      return document;
    } catch (error) {
      if (replacement) {
        await replacement.rollbackAfterFailure().catch((rollbackError) => {
          logger.error(
            {
              err: rollbackError,
              component: 'document_commitment',
              operation: 'restore_replaced_file',
              resourceType: 'document_commitment_file',
            },
            'Unable to restore a replaced document file.',
          );
        });
      }

      throw mapDocumentCommitmentError(error);
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const current = await this.getById(id);
    const title = current.contents[0]?.title ?? `#${id}`;
    const document = await this.repository.deleteWithFile(id);

    if (!document) {
      throw new ApiError(404, 'Document commitment was not found.');
    }

    await this.fileService.removeAfterCommit(document.filename);
    await this.activityLogService.log(
      user,
      'DELETE',
      'DOCUMENT_COMMITMENT',
      title,
    );
  }

  async bulkDelete(ids: number[], user: AuthenticatedUser): Promise<number> {
    const documents = await this.repository.deleteManyWithFiles(ids);

    await Promise.all(
      documents.map(({ filename }) =>
        this.fileService.removeAfterCommit(filename),
      ),
    );

    if (documents.length > 0) {
      await this.activityLogService.logBulk(
        user,
        'DELETE',
        'DOCUMENT_COMMITMENT',
        documents.length,
      );
    }

    return documents.length;
  }

  private async requireCategory(id: number): Promise<void> {
    if (!(await this.categoryRepository.findById(id))) {
      throw new ApiError(400, 'Document commitment category does not exist.');
    }
  }
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
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

function mapDocumentCommitmentError(error: unknown): unknown {
  if (isPrismaError(error, 'P2002')) {
    return new ApiError(
      409,
      'A document commitment with this filename already exists.',
    );
  }

  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Document commitment was not found.');
  }

  if (isPrismaError(error, 'P2003')) {
    return new ApiError(400, 'Document commitment category does not exist.');
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
