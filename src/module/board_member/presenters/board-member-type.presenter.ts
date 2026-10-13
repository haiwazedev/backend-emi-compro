import type { BoardMemberType } from '../../../generated/prisma/client.js';

export function presentBoardMemberType(boardMemberType: BoardMemberType) {
  return {
    id: boardMemberType.id,
    type: boardMemberType.type,
  };
}
