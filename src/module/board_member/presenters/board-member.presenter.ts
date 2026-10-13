import { Prisma } from '../../../generated/prisma/client.js';
import { presentBoardMemberType } from './board-member-type.presenter.js';

export type BoardMemberWithType = Prisma.BoardMemberGetPayload<{
  include: { boardMemberType: true };
}>;

export function presentBoardMember(boardMember: BoardMemberWithType) {
  return {
    id: boardMember.id,
    name: boardMember.name,
    role: boardMember.role,
    board_member_type_id: boardMember.boardMemberTypeId,
    photo: boardMember.photo,
    sort_order: boardMember.sortOrder,
    created_at: boardMember.createdAt.toISOString(),
    created_by: boardMember.createdBy,
    updated_at: boardMember.updatedAt?.toISOString() ?? null,
    updated_by: boardMember.updatedBy,
    board_member_type: presentBoardMemberType(boardMember.boardMemberType),
  };
}
