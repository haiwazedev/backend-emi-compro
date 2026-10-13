import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../shared/db/prisma.js';
import type { BoardMemberListQuery } from '../schemas/board-member.schema.js';
import type { BoardMemberWithType } from '../presenters/board-member.presenter.js';

export type CreateBoardMemberResult =
  | { status: 'invalid-sort-order' }
  | { status: 'ok'; member: BoardMemberWithType };

export type UpdateBoardMemberResult =
  | { status: 'not-found' }
  | { status: 'invalid-sort-order' }
  | { status: 'ok'; member: BoardMemberWithType };

export class BoardMemberRepository {
  findMany(query: BoardMemberListQuery) {
    return prisma.boardMember.findMany({
      where: {
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' } }
          : {}),
        ...(query.board_member_type_id
          ? { boardMemberTypeId: query.board_member_type_id }
          : {}),
      },
      orderBy: [
        { boardMemberTypeId: 'asc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
      include: { boardMemberType: true },
    });
  }

  findById(id: number, transaction?: Prisma.TransactionClient) {
    return (transaction ?? prisma).boardMember.findUnique({
      where: { id },
      include: { boardMemberType: true },
    });
  }

  async create(
    data: Prisma.BoardMemberUncheckedCreateInput,
    transaction: Prisma.TransactionClient,
  ): Promise<CreateBoardMemberResult> {
    const members = await transaction.boardMember.findMany({
      where: { boardMemberTypeId: data.boardMemberTypeId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const sortOrder = data.sortOrder ?? members.length + 1;

    if (sortOrder > members.length + 1) {
      return { status: 'invalid-sort-order' };
    }

    const member = await transaction.boardMember.create({
      data: { ...data, sortOrder },
      include: { boardMemberType: true },
    });
    const orderedIds = members.map(({ id }) => id);
    orderedIds.splice(sortOrder - 1, 0, member.id);
    await assignSortOrder(transaction, orderedIds);

    return { status: 'ok', member };
  }

  async update(
    id: number,
    data: Prisma.BoardMemberUncheckedUpdateInput,
    transaction: Prisma.TransactionClient,
  ): Promise<UpdateBoardMemberResult> {
    const current = await transaction.boardMember.findUnique({
      where: { id },
      select: { id: true, boardMemberTypeId: true, sortOrder: true },
    });

    if (!current) return { status: 'not-found' };

    const targetTypeId =
      typeof data.boardMemberTypeId === 'number'
        ? data.boardMemberTypeId
        : current.boardMemberTypeId;
    const requestedSortOrder =
      typeof data.sortOrder === 'number' ? data.sortOrder : undefined;
    const typeChanged = targetTypeId !== current.boardMemberTypeId;

    if (!typeChanged && requestedSortOrder === undefined) {
      const member = await transaction.boardMember.update({
        where: { id },
        data,
        include: { boardMemberType: true },
      });

      return { status: 'ok', member };
    }

    if (!typeChanged) {
      const members = await transaction.boardMember.findMany({
        where: { boardMemberTypeId: current.boardMemberTypeId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      const orderedIds = members
        .map(({ id: memberId }) => memberId)
        .filter((memberId) => memberId !== id);
      const sortOrder = requestedSortOrder ?? current.sortOrder;

      if (sortOrder > orderedIds.length + 1) {
        return { status: 'invalid-sort-order' };
      }

      orderedIds.splice(sortOrder - 1, 0, id);
      await updateMemberAndOrder(transaction, id, data, orderedIds);
    } else {
      const [sourceMembers, targetMembers] = await Promise.all([
        transaction.boardMember.findMany({
          where: { boardMemberTypeId: current.boardMemberTypeId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true },
        }),
        transaction.boardMember.findMany({
          where: { boardMemberTypeId: targetTypeId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true },
        }),
      ]);
      const sourceIds = sourceMembers
        .map(({ id: memberId }) => memberId)
        .filter((memberId) => memberId !== id);
      const targetIds = targetMembers.map(({ id: memberId }) => memberId);
      const sortOrder = requestedSortOrder ?? targetIds.length + 1;

      if (sortOrder > targetIds.length + 1) {
        return { status: 'invalid-sort-order' };
      }

      targetIds.splice(sortOrder - 1, 0, id);
      await transaction.boardMember.update({
        where: { id },
        data: { ...data, boardMemberTypeId: targetTypeId, sortOrder },
      });
      await assignSortOrder(transaction, sourceIds);
      await assignSortOrder(transaction, targetIds, id);
    }

    const member = await transaction.boardMember.findUnique({
      where: { id },
      include: { boardMemberType: true },
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
      include: { boardMemberType: true },
    });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      const member = await transaction.boardMember.findUnique({
        where: { id },
        select: { boardMemberTypeId: true, photo: true },
      });

      if (!member) return null;

      await transaction.boardMember.delete({ where: { id } });
      const remaining = await transaction.boardMember.findMany({
        where: { boardMemberTypeId: member.boardMemberTypeId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      await assignSortOrder(
        transaction,
        remaining.map(({ id: memberId }) => memberId),
      );

      return { photo: member.photo };
    });
  }
}

async function updateMemberAndOrder(
  transaction: Prisma.TransactionClient,
  memberId: number,
  data: Prisma.BoardMemberUncheckedUpdateInput,
  orderedIds: number[],
): Promise<void> {
  const sortOrder = orderedIds.indexOf(memberId) + 1;

  await transaction.boardMember.update({
    where: { id: memberId },
    data: { ...data, sortOrder },
  });
  await assignSortOrder(transaction, orderedIds, memberId);
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
