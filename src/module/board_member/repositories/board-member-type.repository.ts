import { prisma } from '../../../shared/db/prisma.js';
import type { CreateBoardMemberTypeInput } from '../schemas/board-member-type.schema.js';

export class BoardMemberTypeRepository {
  findMany() {
    return prisma.boardMemberType.findMany({ orderBy: { id: 'asc' } });
  }

  findById(id: number) {
    return prisma.boardMemberType.findUnique({ where: { id } });
  }

  create(input: CreateBoardMemberTypeInput) {
    return prisma.boardMemberType.create({ data: input });
  }

  update(id: number, type: string) {
    return prisma.boardMemberType.update({ where: { id }, data: { type } });
  }

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      const boardMemberType = await transaction.boardMemberType.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!boardMemberType) return null;

      const members = await transaction.boardMember.findMany({
        where: { boardMemberTypeId: id },
        select: { photo: true },
      });

      await transaction.boardMemberType.delete({ where: { id } });

      return members.map(({ photo }) => photo);
    });
  }
}
