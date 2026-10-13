import { z } from 'zod';

const positiveId = z.coerce.number().int().positive();
const positiveOrder = z.coerce.number().int().positive();

const boardMemberFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(100),
    board_member_type_id: positiveId,
    sort_order: positiveOrder.optional(),
  })
  .strict();

export const boardMemberListQuerySchema = z
  .object({
    search: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().max(200).optional(),
    ),
    board_member_type_id: positiveId.optional(),
  })
  .strict();

export const createBoardMemberBodySchema = boardMemberFieldsSchema;
export const updateBoardMemberBodySchema = boardMemberFieldsSchema.partial();

export type BoardMemberListQuery = z.infer<typeof boardMemberListQuerySchema>;
export type CreateBoardMemberInput = z.infer<
  typeof createBoardMemberBodySchema
>;
export type UpdateBoardMemberInput = z.infer<
  typeof updateBoardMemberBodySchema
>;
