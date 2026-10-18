import { z } from 'zod';

const loginRequiredMessage = 'Email and password are required.';

function asBodyObject(value: unknown): unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : {};
}

export const loginBodySchema = z.preprocess(
  asBodyObject,
  z.object({
    email: z
      .string({ error: loginRequiredMessage })
      .trim()
      .min(1, loginRequiredMessage)
      .toLowerCase()
      .email('Email must be valid.'),
    password: z
      .string({ error: loginRequiredMessage })
      .min(1, loginRequiredMessage),
  }),
);

export type LoginInput = z.infer<typeof loginBodySchema>;
