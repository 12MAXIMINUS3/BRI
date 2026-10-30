import { z } from 'zod';

const email = z.string().trim().min(1, 'Please enter your email address').email('Enter a valid email address');
const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Please enter your full name').max(120),
    email,
    phone: z
      .string()
      .trim()
      .max(32)
      .refine((v) => v === '' || /^\+?[\d\s().-]{6,}$/.test(v), 'Use digits, spaces, and + ( ) - only'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: "Passwords don't match" });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: "Passwords don't match" });

export type SignInValues = z.infer<typeof signInSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
