import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { LanguageService } from '../../language/services/language.service.js';
import { BoardMemberRepository } from '../repositories/board-member.repository.js';
import { BoardMemberTypeRepository } from '../repositories/board-member-type.repository.js';
import type {
  BoardMemberListQuery,
  CreateBoardMemberInput,
  UpdateBoardMemberInput,
} from '../schemas/board-member.schema.js';
import {
  BoardMemberFileService,
  type BoardMemberPhotoReplacement,
} from './board-member-file.service.js';

export class BoardMemberService {
  constructor(
    private readonly repository = new BoardMemberRepository(),
    private readonly typeRepository = new BoardMemberTypeRepository(),
    private readonly fileService = new BoardMemberFileService(),
    private readonly languageService = new LanguageService(),
  ) {}

  list(query: BoardMemberListQuery) {
    return this.repository.findMany(query);
  }

  async getById(id: number) {
    const boardMember = await this.repository.findById(id);

    if (!boardMember) {
      throw new ApiError(404, 'Board member was not found.');
    }

    return boardMember;
  }

  async create(
    input: CreateBoardMemberInput,
    photo: Express.Multer.File | undefined,
    userName: string,
  ) {
    await this.languageService.requireActive(input.language_id);
    await this.requireType(input.board_member_type_id, input.language_id);

    const details = photo ? this.fileService.describeUpload(photo) : undefined;
    const data: Prisma.BoardMemberUncheckedCreateInput = {
      name: input.name,
      companyName: input.company_name ?? null,
      ...(input.sort_order !== undefined
        ? { sortOrder: input.sort_order }
        : {}),
      createdBy: getAuditName(userName),
    };
    const content = {
      languageId: input.language_id,
      role: input.role,
      boardMemberTypeId: input.board_member_type_id,
      description: input.description ?? null,
    };
    let replacement: BoardMemberPhotoReplacement | undefined;

    try {
      const result = await prisma.$transaction(async (transaction) => {
        const created = await this.repository.create(
          data,
          content,
          transaction,
        );
        if (created.status === 'invalid-sort-order') return created;

        if (!photo || !details) return created;

        replacement = await this.fileService.replace(
          created.member.id,
          null,
          details,
          photo.buffer,
        );
        const member = await this.repository.updateFields(
          created.member.id,
          { photo: replacement.photoPath },
          transaction,
        );

        return { status: 'ok' as const, member };
      });

      if (result.status === 'invalid-sort-order') {
        throw new ApiError(
          400,
          'sort_order must be between 1 and the total board member count plus one.',
        );
      }

      await replacement?.commitAfterTransaction();
      return result.member;
    } catch (error) {
      await replacement?.rollbackAfterFailure();
      throw mapBoardMemberError(error);
    }
  }

  async update(
    id: number,
    input: UpdateBoardMemberInput,
    photo: Express.Multer.File | undefined,
    userName: string,
  ) {
    const current = await this.getById(id);

    if (Object.keys(input).length === 0 && !photo) {
      throw new ApiError(400, 'At least one board member field is required.');
    }

    if (input.board_member_type_id !== undefined) {
      await this.requireType(input.board_member_type_id, input.language_id!);
    }
    if (input.language_id !== undefined) {
      await this.languageService.requireActive(input.language_id);
    }

    const details = photo ? this.fileService.describeUpload(photo) : undefined;
    const data: Prisma.BoardMemberUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedBy: getAuditName(userName),
    };

    if (input.name !== undefined) data.name = input.name;
    if (input.company_name !== undefined) {
      data.companyName = input.company_name;
    }
    if (input.sort_order !== undefined) data.sortOrder = input.sort_order;

    const content =
      input.language_id !== undefined
        ? {
            languageId: input.language_id,
            ...(input.role !== undefined ? { role: input.role } : {}),
            ...(input.board_member_type_id !== undefined
              ? { boardMemberTypeId: input.board_member_type_id }
              : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
          }
        : undefined;

    let replacement: BoardMemberPhotoReplacement | undefined;

    try {
      const member = await prisma.$transaction(async (transaction) => {
        const updated = await this.repository.update(
          id,
          data,
          content,
          transaction,
        );

        if (updated.status === 'not-found') {
          throw new ApiError(404, 'Board member was not found.');
        }
        if (updated.status === 'invalid-sort-order') {
          throw new ApiError(
            400,
            'sort_order must be between 1 and the total board member count.',
          );
        }
        if (updated.status === 'missing-required-content') {
          throw new ApiError(
            400,
            'role and board_member_type_id are required when adding a board member translation.',
          );
        }

        if (!photo || !details) return updated.member;

        replacement = await this.fileService.replace(
          id,
          current.photo,
          details,
          photo.buffer,
        );

        return this.repository.updateFields(
          id,
          { photo: replacement.photoPath },
          transaction,
        );
      });

      await replacement?.commitAfterTransaction();
      return member;
    } catch (error) {
      await replacement?.rollbackAfterFailure();
      throw mapBoardMemberError(error);
    }
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new ApiError(404, 'Board member was not found.');
    }

    await this.fileService.removeAfterCommit(deleted.photo);
  }

  private async requireType(id: number, languageId: string): Promise<void> {
    const type = await this.typeRepository.findById(id);

    if (!type) {
      throw new ApiError(400, 'Board member type does not exist.');
    }

    if (type.languageId !== languageId) {
      throw new ApiError(
        400,
        'Board member type must use the same language as the board member content.',
      );
    }
  }
}

function getAuditName(name: string): string {
  if (name.length > 100) {
    throw new ApiError(400, 'Authenticated user name exceeds 100 characters.');
  }

  return name;
}

function mapBoardMemberError(error: unknown): unknown {
  if (isPrismaError(error, 'P2003')) {
    return new ApiError(
      400,
      'Board member type does not exist or does not use the selected language.',
    );
  }

  if (isPrismaError(error, 'P2025')) {
    return new ApiError(404, 'Board member was not found.');
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
