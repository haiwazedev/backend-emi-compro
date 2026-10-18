import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';

const faqStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

// One language's content; upserted into `faq_contents`.
const faqContentFieldsSchema = z
  .object({
    language_id: languageIdSchema,
    question: z.string().trim().min(1).max(200),
    answer: z.string().trim().min(1),
    status: faqStatusSchema.default('DRAFT'),
  })
  .strict();

export const createFaqBodySchema = faqContentFieldsSchema;
export const updateFaqBodySchema = faqContentFieldsSchema;

export const faqListQuerySchema = z
  .object({
    language_id: languageIdSchema.optional(),
    status: faqStatusSchema.optional(),
  })
  .strict();

export const reorderFaqsBodySchema = z
  .object({
    faq_ids: z.array(z.number().int().positive()),
  })
  .strict();

export type FaqContentInput = z.infer<typeof faqContentFieldsSchema>;
export type FaqListQuery = z.infer<typeof faqListQuerySchema>;
export type ReorderFaqsInput = z.infer<typeof reorderFaqsBodySchema>;
