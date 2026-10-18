import { ApiError } from '../../../shared/errors/api-error.js';
import { LanguageService } from '../../language/services/language.service.js';
import { BoardMemberFileService } from './board-member-file.service.js';
import { BoardMemberTypeRepository } from '../repositories/board-member-type.repository.js';
import type {
  CreateBoardMemberTypeInput,
  UpdateBoardMemberTypeInput,
} from '../schemas/board-member-type.schema.js';

export class BoardMemberTypeService {
  constructor(
    private readonly repository = new BoardMemberTypeRepository(),
    private readonly fileService = new BoardMemberFileService(),
    private readonly languageService = new LanguageService(),
  ) {}

  list() {
    return this.repository.findMany();
  }

  async getById(id: number) {
    const boardMemberType = await this.repository.findById(id);

    if (!boardMemberType) {
      throw new ApiError(404, 'Board member type was not found.');
    }

    return boardMemberType;
  }

  async create(input: CreateBoardMemberTypeInput) {
    await this.languageService.requireActive(input.language_id);

    try {
      return await this.repository.create(input);
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ApiError(400, 'Language does not exist or is inactive.');
      }

      throw error;
    }
  }

  async update(id: number, input: UpdateBoardMemberTypeInput) {
    await this.getById(id);

    if (Object.keys(input).length === 0) {
      throw new ApiError(
        400,
        'At least one board member type field is required.',
      );
    }
    if (input.type === undefined) {
      throw new ApiError(
        400,
        'At least one board member type field is required.',
      );
    }

    try {
      return await this.repository.update(id, input.type);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Board member type was not found.');
      }

      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const photos = await this.repository.delete(id);

    if (!photos) {
      throw new ApiError(404, 'Board member type was not found.');
    }

    await Promise.all(
      photos.map((photo) => this.fileService.removeAfterCommit(photo)),
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
