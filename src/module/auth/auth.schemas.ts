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

export const strongPasswordSchema = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  // Caps argon2 hashing cost per request.
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol.');

export type LoginInput = z.infer<typeof loginBodySchema>;
