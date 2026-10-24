import { z } from 'zod';

export const mediaTypeSchema = z.enum(['PICTURE', 'DOCUMENT']);

const mediaFilenameSchema = z.string().trim().min(1).max(255);
const mediaAltSchema = z
  .string()
  .trim()
  .max(255)
  .transform((alt) => alt || null);

export const uploadMediaBodySchema = z
  .object({
    type: mediaTypeSchema,
    filename: mediaFilenameSchema.optional(),
    alt: mediaAltSchema.optional(),
  })
  .strict();

export const updateMediaBodySchema = z
  .object({
    filename: mediaFilenameSchema,
    alt: mediaAltSchema.nullable(),
  })
  .strict();

export const mediaListQuerySchema = z
  .object({
    type: mediaTypeSchema.optional(),
    sort_by: z.literal('created_at').default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const bulkDeleteMediaBodySchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1),
  })
  .strict();

export type MediaType = z.infer<typeof mediaTypeSchema>;
export type UploadMediaInput = z.infer<typeof uploadMediaBodySchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaBodySchema>;
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaBodySchema>;
