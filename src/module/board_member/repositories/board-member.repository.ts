import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import { compactBoardMemberOrder } from './board-member-order.js';
import type { BoardMemberListQuery } from '../schemas/board-member.schema.js';
import type { BoardMemberWithContents } from '../presenters/board-member.presenter.js';

const boardMemberInclude = {
  contents: {
    orderBy: [{ language: { sortOrder: 'asc' } }, { languageId: 'asc' }],
    include: { boardMemberType: true },
  },
} satisfies Prisma.BoardMemberInclude;

export type BoardMemberContentWrite = {
  languageId: string;
  role?: string;
  boardMemberTypeId?: number;
  description?: string | null;
};

export type CreateBoardMemberResult =
  | { status: 'invalid-sort-order' }
  | { status: 'ok'; member: BoardMemberWithContents };

export type UpdateBoardMemberResult =
  | { status: 'not-found' }
  | { status: 'invalid-sort-order' }
  | { status: 'missing-required-content' }
  | { status: 'ok'; member: BoardMemberWithContents };

export class BoardMemberRepository {
  findMany(query: BoardMemberListQuery) {
    return prisma.boardMember.findMany({
      where: {
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' } }
          : {}),
        ...(query.board_member_type_id
          ? {
              contents: {
                some: { boardMemberTypeId: query.board_member_type_id },
              },
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: boardMemberInclude,
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).boardMember.findUnique({
      where: { id },
      include: boardMemberInclude,
    });
  }

  async create(
    data: Prisma.BoardMemberUncheckedCreateInput,
    content: Required<
      Pick<BoardMemberContentWrite, 'languageId' | 'role' | 'boardMemberTypeId'>
    > &
      Pick<BoardMemberContentWrite, 'description'>,
    transaction: Prisma.TransactionClient,
  ): Promise<CreateBoardMemberResult> {
    const members = await transaction.boardMember.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const sortOrder = data.sortOrder ?? members.length + 1;

    if (sortOrder > members.length + 1) {
      return { status: 'invalid-sort-order' };
    }

    const member = await transaction.boardMember.create({
      data: { ...data, sortOrder },
      select: { id: true },
    });

    await transaction.boardMemberContent.create({
      data: {
        boardMemberId: member.id,
        languageId: content.languageId,
        role: content.role,
        boardMemberTypeId: content.boardMemberTypeId,
        description: content.description ?? null,
      },
    });

    const orderedIds = members.map(({ id }) => id);
    orderedIds.splice(sortOrder - 1, 0, member.id);
    await assignSortOrder(transaction, orderedIds);

    const created = await transaction.boardMember.findUniqueOrThrow({
      where: { id: member.id },
      include: boardMemberInclude,
    });

    return { status: 'ok', member: created };
  }

  async update(
    id: number,
    data: Prisma.BoardMemberUncheckedUpdateInput,
    content: BoardMemberContentWrite | undefined,
    transaction: Prisma.TransactionClient,
  ): Promise<UpdateBoardMemberResult> {
    const current = await transaction.boardMember.findUnique({
      where: { id },
      select: { id: true, sortOrder: true },
    });

    if (!current) return { status: 'not-found' };

    const existingContent = content
      ? await transaction.boardMemberContent.findUnique({
          where: {
            boardMemberId_languageId: {
              boardMemberId: id,
              languageId: content.languageId,
            },
          },
        })
      : null;

    if (
      content &&
      !existingContent &&
      (content.role === undefined || content.boardMemberTypeId === undefined)
    ) {
      return { status: 'missing-required-content' };
    }

    let orderedIds: number[] | undefined;
    const requestedSortOrder =
      typeof data.sortOrder === 'number' ? data.sortOrder : undefined;

    if (requestedSortOrder !== undefined) {
      const otherMembers = await transaction.boardMember.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      orderedIds = otherMembers
        .map(({ id: memberId }) => memberId)
        .filter((memberId) => memberId !== id);

      if (requestedSortOrder > orderedIds.length + 1) {
        return { status: 'invalid-sort-order' };
      }

      orderedIds.splice(requestedSortOrder - 1, 0, id);
    }

    await transaction.boardMember.update({
      where: { id },
      data,
    });

    if (content) {
      const where = {
        boardMemberId_languageId: {
          boardMemberId: id,
          languageId: content.languageId,
        },
      };

      if (existingContent) {
        await transaction.boardMemberContent.update({
          where,
          data: {
            ...(content.role !== undefined ? { role: content.role } : {}),
            ...(content.boardMemberTypeId !== undefined
              ? { boardMemberTypeId: content.boardMemberTypeId }
              : {}),
            ...(content.description !== undefined
              ? { description: content.description }
              : {}),
          },
        });
      } else {
        await transaction.boardMemberContent.create({
          data: {
            boardMemberId: id,
            languageId: content.languageId,
            role: content.role!,
            boardMemberTypeId: content.boardMemberTypeId!,
            description: content.description ?? null,
          },
        });
      }
    }

    if (orderedIds) {
      await assignSortOrder(transaction, orderedIds, id);
    }

    const member = await transaction.boardMember.findUnique({
      where: { id },
      include: boardMemberInclude,
    });

    return member ? { status: 'ok', member } : { status: 'not-found' };
  }

  updateFields(
    id: number,
    data: Prisma.BoardMemberUncheckedUpdateInput,
    transaction: Prisma.TransactionClient,
  ) {
    return transaction.boardMember.update({
      where: { id },
      data,
      include: boardMemberInclude,
    });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      const member = await transaction.boardMember.findUnique({
        where: { id },
        select: { photo: true },
      });

      if (!member) return null;

      await transaction.boardMember.delete({ where: { id } });
      await compactBoardMemberOrder(transaction);

      return { photo: member.photo };
    });
  }
}

async function assignSortOrder(
  transaction: Prisma.TransactionClient,
  orderedIds: number[],
  skipId?: number,
): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    if (id === skipId) continue;

    await transaction.boardMember.update({
      where: { id },
      data: { sortOrder: index + 1 },
    });
  }
}
