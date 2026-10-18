import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
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
    private readonly activityLogService = new ActivityLogService(),
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

  async create(input: CreateBoardMemberTypeInput, user: AuthenticatedUser) {
    await this.languageService.requireActive(input.language_id);

    try {
      const boardMemberType = await this.repository.create(input);
      await this.activityLogService.log(
        user,
        'menambahkan tipe anggota direksi',
        boardMemberType.type,
      );
      return boardMemberType;
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ApiError(400, 'Language does not exist or is inactive.');
      }

      throw error;
    }
  }

  async update(
    id: number,
    input: UpdateBoardMemberTypeInput,
    user: AuthenticatedUser,
  ) {
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
      const boardMemberType = await this.repository.update(id, input.type);
      await this.activityLogService.log(
        user,
        'memperbarui tipe anggota direksi',
        boardMemberType.type,
      );
      return boardMemberType;
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new ApiError(404, 'Board member type was not found.');
      }

      throw error;
    }
  }

  async delete(id: number, user: AuthenticatedUser): Promise<void> {
    const boardMemberType = await this.getById(id);
    const photos = await this.repository.delete(id);

    if (!photos) {
      throw new ApiError(404, 'Board member type was not found.');
    }

    await Promise.all(
      photos.map((photo) => this.fileService.removeAfterCommit(photo)),
    );
    await this.activityLogService.log(
      user,
      'menghapus tipe anggota direksi',
      boardMemberType.type,
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
