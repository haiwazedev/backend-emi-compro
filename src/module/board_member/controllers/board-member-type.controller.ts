import type { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentBoardMemberType } from '../presenters/board-member-type.presenter.js';
import { BoardMemberTypeService } from '../services/board-member-type.service.js';
import type {
  CreateBoardMemberTypeInput,
  UpdateBoardMemberTypeInput,
} from '../schemas/board-member-type.schema.js';

export class BoardMemberTypeController {
  constructor(private readonly service = new BoardMemberTypeService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const types = await this.service.list();

    res.status(200).json({
      board_member_types: types.map(presentBoardMemberType),
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const boardMemberType = await this.service.getById(
      parseIdParam(req.params.typeId),
    );

    res.status(200).json({
      board_member_type: presentBoardMemberType(boardMemberType),
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const boardMemberType = await this.service.create(
      req.body as CreateBoardMemberTypeInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({
      board_member_type: presentBoardMemberType(boardMemberType),
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const boardMemberType = await this.service.update(
      parseIdParam(req.params.typeId),
      req.body as UpdateBoardMemberTypeInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({
      board_member_type: presentBoardMemberType(boardMemberType),
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.typeId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
