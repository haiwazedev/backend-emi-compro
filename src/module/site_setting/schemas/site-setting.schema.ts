import { z } from 'zod';

export const MAX_SOCIAL_MEDIAS = 20;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const optionalEmail = z
  .email()
  .max(254)
  .or(z.literal(''))
  .nullish()
  .transform((value) => value || null);

const optionalTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use the HH:mm format.')
  .or(z.literal(''))
  .nullish()
  .transform((value) => value || null);

const socialMediaSchema = z
  .object({
    id: z.number().int().positive().optional(),
    platform_name: z.string().trim().min(1).max(50),
    platform_url_or_account_name: z.string().trim().min(1).max(255),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    icon_index: z.number().int().nonnegative().optional(),
  })
  .strict();

export const saveSiteSettingBodySchema = z
  .object({
    company_name: z.string().trim().min(1).max(200),
    company_short_name: optionalText(50),
    company_address: z.string().trim().min(1).max(500),
    company_phone_number: optionalText(30),
    company_whatsapp_number: optionalText(30),
    main_email: optionalEmail,
    marketing_email: optionalEmail,
    operational_day: optionalText(100),
    operational_start_time: optionalTime,
    operational_end_time: optionalTime,
    social_medias: z.array(socialMediaSchema).max(MAX_SOCIAL_MEDIAS),
  })
  .strict()
  .refine(
    (body) =>
      Boolean(body.operational_start_time) ===
      Boolean(body.operational_end_time),
    { message: 'Operational start and end time must be filled together.' },
  );

export type SaveSiteSettingInput = z.infer<typeof saveSiteSettingBodySchema>;
export type SaveSocialMediaInput =
  SaveSiteSettingInput['social_medias'][number];
