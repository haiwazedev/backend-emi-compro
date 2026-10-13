import { z } from 'zod';

const boardMemberTypeFieldsSchema = z
  .object({
    type: z.string().trim().min(1).max(100),
  })
  .strict();

export const boardMemberTypeListQuerySchema = z.object({}).strict();
export const createBoardMemberTypeBodySchema = boardMemberTypeFieldsSchema;
export const updateBoardMemberTypeBodySchema =
  boardMemberTypeFieldsSchema.partial();

export type CreateBoardMemberTypeInput = z.infer<
  typeof createBoardMemberTypeBodySchema
>;
export type UpdateBoardMemberTypeInput = z.infer<
  typeof updateBoardMemberTypeBodySchema
>;
