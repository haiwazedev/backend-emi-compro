import { z } from 'zod';

const articleStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

const nullableText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === '' ? null : value),
    z.union([z.null(), z.string().trim().max(maxLength)]),
  );

const nullableDate = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([
    z.null(),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must use YYYY-MM-DD format.')
      .refine(isValidDate, 'Issue date is invalid.')
      .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  ]),
);

const articleFormFieldsSchema = z
  .object({
    article_category_id: z.coerce.number().int().positive(),
    title: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(255),
    summary: z.string().trim().min(1),
    content: z.string().refine((value) => value.trim().length > 0),
    issue_date: nullableDate.optional(),
    press_release_number: nullableText(255).optional(),
    cp_name: nullableText(100).optional(),
    cp_role: nullableText(100).optional(),
    cp_phone_number: nullableText(100).optional(),
    cp_email: nullableText(100).optional(),
    status: articleStatusSchema.optional(),
  })
  .strict();

export const createArticleBodySchema = articleFormFieldsSchema;
export const updateArticleBodySchema = articleFormFieldsSchema.partial();

export const articleListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().max(255).optional(),
    ),
    article_category_id: z.coerce.number().int().positive().optional(),
    status: articleStatusSchema.optional(),
    sort_by: z.literal('created_at').default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type CreateArticleInput = z.infer<typeof createArticleBodySchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleBodySchema>;
export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
