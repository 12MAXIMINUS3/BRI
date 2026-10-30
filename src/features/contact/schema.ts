import { z } from 'zod';

export const CONTACT_SUBJECTS = [
  'General question',
  'Question about a product',
  'Question about an existing request or order',
  'Trade or commercial enquiry',
  'Other',
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().min(1, 'Please enter your email address').email('Enter a valid email address').max(254),
  phone: z
    .string()
    .trim()
    .max(32, 'That phone number looks too long')
    .refine((v) => v === '' || /^\+?[\d\s().-]{6,}$/.test(v), 'Use digits, spaces, and + ( ) - only'),
  subject: z.enum(CONTACT_SUBJECTS, { errorMap: () => ({ message: 'Choose a subject' }) }),
  message: z.string().trim().min(10, 'Please write at least 10 characters').max(4000),
  /**
   * Honeypot. Hidden from people and assistive technology. Bots that fill
   * every field get a silent "success" from the backend, which also rate-limits.
   */
  website: z.string().max(500),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const CONTACT_DEFAULTS: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  subject: CONTACT_SUBJECTS[0],
  message: '',
  website: '',
};
