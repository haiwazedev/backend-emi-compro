import { z } from 'zod';

export const mediaTypeSchema = z.enum(['PICTURE', 'DOCUMENT']);

export const uploadMediaBodySchema = z
  .object({
    type: mediaTypeSchema,
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
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaBodySchema>;
