import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Please enter your corporate email address.' })
      .trim()
      .email('Please enter a valid email address.')
      .transform((val) => val.toLowerCase()),
    password: z
      .string({ required_error: 'Please enter your password.' })
      .min(1, 'Please enter your password.')
  })
});

export const googleLoginSchema = z.object({
  body: z.object({
    credential: z
      .string({ required_error: 'Google sign-in token is missing. Please try signing in again.' })
      .min(1, 'Google sign-in token is missing. Please try signing in again.')
  })
});
