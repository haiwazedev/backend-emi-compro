import type { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentBoardMember } from '../presenters/board-member.presenter.js';
import { BoardMemberService } from '../services/board-member.service.js';
import type {
  BoardMemberListQuery,
  CreateBoardMemberInput,
  UpdateBoardMemberInput,
} from '../schemas/board-member.schema.js';

export class BoardMemberController {
  constructor(private readonly service = new BoardMemberService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.boardMemberListQuery as BoardMemberListQuery;
    const members = await this.service.list(query);

    res.status(200).json({ board_members: members.map(presentBoardMember) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const member = await this.service.getById(
      parseIdParam(req.params.memberId),
    );

    res.status(200).json({ board_member: presentBoardMember(member) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const member = await this.service.create(
      req.body as CreateBoardMemberInput,
      req.file,
      getAuthenticatedUser(req),
    );

    res.status(201).json({ board_member: presentBoardMember(member) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const member = await this.service.update(
      parseIdParam(req.params.memberId),
      req.body as UpdateBoardMemberInput,
      req.file,
      getAuthenticatedUser(req),
    );

    res.status(200).json({ board_member: presentBoardMember(member) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.memberId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
