import { prisma } from '../../../shared/db/prisma.js';
import { compactBoardMemberOrder } from './board-member-order.js';
import type { CreateBoardMemberTypeInput } from '../schemas/board-member-type.schema.js';

export class BoardMemberTypeRepository {
  findMany() {
    return prisma.boardMemberType.findMany({
      orderBy: [
        { language: { sortOrder: 'asc' } },
        { languageId: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  findById(id: number) {
    return prisma.boardMemberType.findUnique({ where: { id } });
  }

  create(input: CreateBoardMemberTypeInput) {
    return prisma.boardMemberType.create({
      data: { type: input.type, languageId: input.language_id },
    });
  }

  update(id: number, type: string) {
    return prisma.boardMemberType.update({ where: { id }, data: { type } });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      const boardMemberType = await transaction.boardMemberType.findUnique({
        where: { id },
        select: {
          id: true,
          contents: { select: { boardMemberId: true } },
        },
      });

      if (!boardMemberType) return null;

      await transaction.boardMemberType.delete({ where: { id } });

      const memberIds = [
        ...new Set(
          boardMemberType.contents.map(({ boardMemberId }) => boardMemberId),
        ),
      ];
      const orphanedMembers = memberIds.length
        ? await transaction.boardMember.findMany({
            where: { id: { in: memberIds }, contents: { none: {} } },
            select: { id: true, photo: true },
          })
        : [];

      if (orphanedMembers.length > 0) {
        await transaction.boardMember.deleteMany({
          where: {
            id: { in: orphanedMembers.map(({ id: memberId }) => memberId) },
          },
        });
        await compactBoardMemberOrder(transaction);
      }

      return orphanedMembers.map(({ photo }) => photo);
    });
  }
}
