import { Prisma } from '../../../generated/prisma/client.js';
import { presentBoardMemberType } from './board-member-type.presenter.js';

export type BoardMemberWithContents = Prisma.BoardMemberGetPayload<{
  include: { contents: { include: { boardMemberType: true } } };
}>;

export function presentBoardMember(boardMember: BoardMemberWithContents) {
  return {
    id: boardMember.id,
    name: boardMember.name,
    company_name: boardMember.companyName,
    photo: boardMember.photo,
    sort_order: boardMember.sortOrder,
    created_at: boardMember.createdAt.toISOString(),
    created_by: boardMember.createdBy,
    updated_at: boardMember.updatedAt?.toISOString() ?? null,
    updated_by: boardMember.updatedBy,
    contents: boardMember.contents.map((content) => ({
      language_id: content.languageId,
      role: content.role,
      board_member_type_id: content.boardMemberTypeId,
      description: content.description,
      board_member_type: presentBoardMemberType(content.boardMemberType),
    })),
  };
}
