import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const positiveId = z.coerce.number().int().positive();
const positiveOrder = z.coerce.number().int().positive();
const descriptionSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  );
const companyNameSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .optional()
  .transform((value) => (value === '' ? null : value));

const boardMemberFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    company_name: companyNameSchema,
    language_id: languageIdSchema,
    role: z.string().trim().min(1).max(100),
    board_member_type_id: positiveId,
    description: descriptionSchema,
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
export const updateBoardMemberBodySchema = boardMemberFieldsSchema
  .partial()
  .superRefine((input, context) => {
    const hasContent =
      input.role !== undefined ||
      input.board_member_type_id !== undefined ||
      input.description !== undefined;

    if (hasContent && input.language_id === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'language_id is required when updating translated fields.',
        path: ['language_id'],
      });
    }

    if (input.language_id !== undefined && !hasContent) {
      context.addIssue({
        code: 'custom',
        message: 'At least one translated field is required with language_id.',
        path: ['language_id'],
      });
    }
  });

export type BoardMemberListQuery = z.infer<typeof boardMemberListQuerySchema>;
export type CreateBoardMemberInput = z.infer<
  typeof createBoardMemberBodySchema
>;
export type UpdateBoardMemberInput = z.infer<
  typeof updateBoardMemberBodySchema
>;
