import { z } from 'zod';

const articleCategoryFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(100),
  })
  .strict();

export const createArticleCategoryBodySchema = articleCategoryFieldsSchema;
export const updateArticleCategoryBodySchema =
  articleCategoryFieldsSchema.partial();

export type CreateArticleCategoryInput = z.infer<
  typeof createArticleCategoryBodySchema
>;
export type UpdateArticleCategoryInput = z.infer<
  typeof updateArticleCategoryBodySchema
>;
