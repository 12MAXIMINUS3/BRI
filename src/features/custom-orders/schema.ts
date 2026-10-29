import { z } from 'zod';
import { MEASUREMENT_UNITS, isCategorySlug } from '@/config/catalog';

/**
 * Client-side validation for custom-order requests. The database repeats
 * these checks (constraints and the `submit_custom_request` function in
 * Phase 2/3), so this schema is for user feedback, not security.
 *
 * Form values are kept as strings (that is what inputs produce) and converted
 * to numbers when building the API payload.
 */

const UNIT_VALUES = MEASUREMENT_UNITS.map((u) => u.value) as [string, ...string[]];

function isPositiveNumber(value: string, max: number): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false;
  const n = Number(value);
  return n > 0 && n <= max;
}

const optionalDimension = z
  .string()
  .trim()
  .refine((v) => v === '' || isPositiveNumber(v, 100_000), 'Enter a positive number');

const optionalBudget = z
  .string()
  .trim()
  .refine((v) => v === '' || isPositiveNumber(v, 1_000_000_000), 'Enter an amount greater than zero');

/** `YYYY-MM-DD` string that is today or later in the visitor's time zone. */
export function isTodayOrLater(value: string, now: Date = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date >= today;
}

export const customOrderSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Please enter your full name').max(120, 'Keep this under 120 characters'),
    email: z.string().trim().min(1, 'Please enter your email address').email('Enter a valid email address').max(254),
    phone: z
      .string()
      .trim()
      .min(6, 'Enter a phone number we can reach you on')
      .max(32, 'That phone number looks too long')
      .regex(/^\+?[\d\s().-]+$/, 'Use digits, spaces, and + ( ) - only'),
    // Explicit `boolean` return keeps the form value typed as a plain string ('' while unselected).
    category: z.string().refine((v): boolean => isCategorySlug(v), 'Choose the closest category'),
    description: z
      .string()
      .trim()
      .min(20, 'Please describe your project in at least 20 characters')
      .max(5000, 'Keep the description under 5000 characters'),
    width: optionalDimension,
    depth: optionalDimension,
    height: optionalDimension,
    unit: z.enum(UNIT_VALUES),
    dimensionNotes: z.string().trim().max(500, 'Keep this under 500 characters'),
    material: z.string().min(1, 'Choose a material, or "I need advice"'),
    finish: z.string().min(1, 'Choose a finish, or "I need advice"'),
    quantity: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500, 'Enter a whole number from 1 to 500'),
    budgetMin: optionalBudget,
    budgetMax: optionalBudget,
    preferredDate: z
      .string()
      .refine((v) => v === '' || isTodayOrLater(v), 'Choose a date that is today or later'),
    deliveryLocation: z
      .string()
      .trim()
      .min(2, 'Tell us where the piece will be delivered or collected')
      .max(300, 'Keep this under 300 characters'),
    referenceProjectSlug: z.string(),
    acknowledged: z.boolean().refine((v) => v, 'Please confirm you understand this is a request, not an order'),
  })
  .superRefine((values, ctx) => {
    if (values.budgetMin && values.budgetMax && Number(values.budgetMax) < Number(values.budgetMin)) {
      ctx.addIssue({ code: 'custom', path: ['budgetMax'], message: 'Maximum must be at least the minimum' });
    }
  });

export type CustomOrderFormValues = z.infer<typeof customOrderSchema>;

export const CUSTOM_ORDER_DEFAULTS: CustomOrderFormValues = {
  fullName: '',
  email: '',
  phone: '',
  category: '',
  description: '',
  width: '',
  depth: '',
  height: '',
  unit: 'cm',
  dimensionNotes: '',
  material: '',
  finish: '',
  quantity: '1',
  budgetMin: '',
  budgetMax: '',
  preferredDate: '',
  deliveryLocation: '',
  referenceProjectSlug: '',
  acknowledged: false,
};

// --- Reference images ---------------------------------------------------------
// Mirrored by the private `request-attachments` storage bucket limits in Phase 2.

export const REFERENCE_IMAGE_RULES = {
  maxFiles: 5,
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export function validateReferenceFiles(files: readonly Pick<File, 'name' | 'size' | 'type'>[]): string | null {
  if (files.length > REFERENCE_IMAGE_RULES.maxFiles) {
    return `You can attach up to ${REFERENCE_IMAGE_RULES.maxFiles} images.`;
  }
  for (const file of files) {
    if (!(REFERENCE_IMAGE_RULES.mimeTypes as readonly string[]).includes(file.type)) {
      return `"${file.name}" isn't a supported image. Use JPEG, PNG, or WebP.`;
    }
    if (file.size > REFERENCE_IMAGE_RULES.maxBytes) {
      return `"${file.name}" is larger than 10 MB.`;
    }
  }
  return null;
}
