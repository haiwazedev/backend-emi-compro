import { Router } from 'express';
import {
  createAuthMiddleware,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { BoardMemberController } from '../controllers/board-member.controller.js';
import { BoardMemberTypeController } from '../controllers/board-member-type.controller.js';
import { uploadBoardMemberPhoto } from '../middlewares/board-member-upload.middleware.js';
import {
  createBoardMemberBodySchema,
  boardMemberListQuerySchema,
  updateBoardMemberBodySchema,
} from '../schemas/board-member.schema.js';
import {
  boardMemberTypeListQuerySchema,
  createBoardMemberTypeBodySchema,
  updateBoardMemberTypeBodySchema,
} from '../schemas/board-member-type.schema.js';

const boardMemberController = new BoardMemberController();
const boardMemberTypeController = new BoardMemberTypeController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const boardMemberRouter = Router();

boardMemberRouter.get(
  '/board_member_types',
  validateQuery(boardMemberTypeListQuerySchema, 'boardMemberTypeListQuery'),
  boardMemberTypeController.list,
);
boardMemberRouter.get(
  '/board_member_types/:typeId',
  boardMemberTypeController.get,
);
boardMemberRouter.post(
  '/board_member_types',
  requireAuth,
  requireWrite,
  validateBody(createBoardMemberTypeBodySchema),
  boardMemberTypeController.create,
);
boardMemberRouter.put(
  '/board_member_types/:typeId',
  requireAuth,
  requireWrite,
  validateBody(updateBoardMemberTypeBodySchema),
  boardMemberTypeController.update,
);
boardMemberRouter.delete(
  '/board_member_types/:typeId',
  requireAuth,
  requireDelete,
  boardMemberTypeController.delete,
);

boardMemberRouter.get(
  '/board_members',
  validateQuery(boardMemberListQuerySchema, 'boardMemberListQuery'),
  boardMemberController.list,
);
boardMemberRouter.get('/board_members/:memberId', boardMemberController.get);
boardMemberRouter.post(
  '/board_members',
  requireAuth,
  requireWrite,
  uploadBoardMemberPhoto,
  validateBody(createBoardMemberBodySchema),
  boardMemberController.create,
);
boardMemberRouter.put(
  '/board_members/:memberId',
  requireAuth,
  requireWrite,
  uploadBoardMemberPhoto,
  validateBody(updateBoardMemberBodySchema),
  boardMemberController.update,
);
boardMemberRouter.delete(
  '/board_members/:memberId',
  requireAuth,
  requireDelete,
  boardMemberController.delete,
);
