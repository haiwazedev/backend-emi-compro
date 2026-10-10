import { z } from 'zod';

const registerRequiredMessage = 'Name, email, and password are required.';
const loginRequiredMessage = 'Email and password are required.';

function asBodyObject(value: unknown): unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : {};
}

export const registerBodySchema = z.preprocess(
  asBodyObject,
  z.object({
    name: z
      .string({ error: registerRequiredMessage })
      .trim()
      .min(1, registerRequiredMessage),
    email: z
      .string({ error: registerRequiredMessage })
      .trim()
      .min(1, registerRequiredMessage)
      .toLowerCase()
      .email('Email must be valid.'),
    password: z
      .string({ error: registerRequiredMessage })
      .min(1, registerRequiredMessage),
  }),
);

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

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
