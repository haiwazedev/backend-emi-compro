import { z } from 'zod';

const faqStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

const faqFieldsSchema = z
  .object({
    question: z.string().trim().min(1).max(200),
    answer: z.string().trim().min(1),
    status: faqStatusSchema.optional(),
  })
  .strict();

export const createFaqBodySchema = faqFieldsSchema;
export const updateFaqBodySchema = faqFieldsSchema.partial();

export const faqListQuerySchema = z
  .object({
    status: faqStatusSchema.optional(),
  })
  .strict();

export const reorderFaqsBodySchema = z
  .object({
    faq_ids: z.array(z.number().int().positive()),
  })
  .strict();

export type CreateFaqInput = z.infer<typeof createFaqBodySchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqBodySchema>;
export type FaqListQuery = z.infer<typeof faqListQuerySchema>;
export type ReorderFaqsInput = z.infer<typeof reorderFaqsBodySchema>;
