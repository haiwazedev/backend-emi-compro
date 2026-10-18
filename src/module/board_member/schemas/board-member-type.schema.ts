import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const boardMemberTypeFieldsSchema = z
  .object({
    type: z.string().trim().min(1).max(100),
    language_id: languageIdSchema,
  })
  .strict();

export const boardMemberTypeListQuerySchema = z.object({}).strict();
export const createBoardMemberTypeBodySchema = boardMemberTypeFieldsSchema;
export const updateBoardMemberTypeBodySchema = z
  .object({ type: z.string().trim().min(1).max(100) })
  .strict();

export type CreateBoardMemberTypeInput = z.infer<
  typeof createBoardMemberTypeBodySchema
>;
export type UpdateBoardMemberTypeInput = z.infer<
  typeof updateBoardMemberTypeBodySchema
>;
