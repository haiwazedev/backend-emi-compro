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

export const forgotPasswordBodySchema = z.preprocess(
  asBodyObject,
  z.object({
    email: z
      .string({ error: 'Email is required.' })
      .trim()
      .toLowerCase()
      .email('Email must be valid.'),
  }),
);

const tokenSchema = z
  .string({ error: 'Token is required.' })
  .min(1, 'Token is required.')
  .max(200);

export const verifyTokenBodySchema = z.preprocess(
  asBodyObject,
  z.object({ token: tokenSchema }),
);

export const activateBodySchema = z.preprocess(
  asBodyObject,
  z.object({ token: tokenSchema, password: strongPasswordSchema }),
);

export type LoginInput = z.infer<typeof loginBodySchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBodySchema>;
export type VerifyTokenInput = z.infer<typeof verifyTokenBodySchema>;
export type ActivateInput = z.infer<typeof activateBodySchema>;
