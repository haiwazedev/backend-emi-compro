import { Prisma } from '../../../generated/prisma/client.js';

export async function compactBoardMemberOrder(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const members = await transaction.boardMember.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, sortOrder: true },
  });

  for (const [index, member] of members.entries()) {
    const sortOrder = index + 1;

    if (member.sortOrder !== sortOrder) {
      await transaction.boardMember.update({
        where: { id: member.id },
        data: { sortOrder },
      });
    }
  }
}
