import { describe, expect, it } from 'vitest';
import { toCustomOrderPayload } from './api';
import {
  CUSTOM_ORDER_DEFAULTS,
  customOrderSchema,
  isTodayOrLater,
  validateReferenceFiles,
  type CustomOrderFormValues,
} from './schema';

const valid: CustomOrderFormValues = {
  ...CUSTOM_ORDER_DEFAULTS,
  fullName: 'Sam Carter',
  email: 'Sam@Example.com ',
  phone: '+1 555 010 0000',
  category: 'tables',
  description: 'A round dining table for six, to match existing oak chairs.',
  width: '140',
  unit: 'cm',
  material: 'need-advice',
  finish: 'Natural oil',
  quantity: '1',
  deliveryLocation: 'City centre',
  acknowledged: true,
};

function issuesFor(values: CustomOrderFormValues) {
  const result = customOrderSchema.safeParse(values);
  return result.success ? {} : result.error.flatten().fieldErrors;
}

describe('customOrderSchema', () => {
  it('accepts a complete request', () => {
    expect(customOrderSchema.safeParse(valid).success).toBe(true);
  });

  it('requires the acknowledgement that a request is not an order', () => {
    expect(issuesFor({ ...valid, acknowledged: false })).toHaveProperty('acknowledged');
  });

  it('rejects unknown categories', () => {
    expect(issuesFor({ ...valid, category: 'spaceships' })).toHaveProperty('category');
  });

  it('rejects non-numeric and non-positive dimensions', () => {
    expect(issuesFor({ ...valid, width: 'wide' })).toHaveProperty('width');
    expect(issuesFor({ ...valid, height: '0' })).toHaveProperty('height');
  });

  it('requires a whole-number quantity within limits', () => {
    expect(issuesFor({ ...valid, quantity: '0' })).toHaveProperty('quantity');
    expect(issuesFor({ ...valid, quantity: '1.5' })).toHaveProperty('quantity');
    expect(issuesFor({ ...valid, quantity: '501' })).toHaveProperty('quantity');
  });

  it('requires the budget maximum to be at least the minimum', () => {
    expect(issuesFor({ ...valid, budgetMin: '900', budgetMax: '500' })).toHaveProperty('budgetMax');
    expect(issuesFor({ ...valid, budgetMin: '500', budgetMax: '900' })).not.toHaveProperty('budgetMax');
  });
});

describe('isTodayOrLater', () => {
  const now = new Date(2026, 9, 29, 15, 0);
  it('accepts today and future dates', () => {
    expect(isTodayOrLater('2026-10-29', now)).toBe(true);
    expect(isTodayOrLater('2027-01-01', now)).toBe(true);
  });
  it('rejects past or malformed dates', () => {
    expect(isTodayOrLater('2026-10-28', now)).toBe(false);
    expect(isTodayOrLater('29/10/2026', now)).toBe(false);
  });
});

describe('validateReferenceFiles', () => {
  const file = (name: string, type: string, size = 1000) => ({ name, type, size });

  it('accepts supported images', () => {
    expect(validateReferenceFiles([file('a.jpg', 'image/jpeg'), file('b.webp', 'image/webp')])).toBeNull();
  });
  it('rejects unsupported types', () => {
    expect(validateReferenceFiles([file('plan.pdf', 'application/pdf')])).toMatch(/supported image/);
  });
  it('rejects oversized files', () => {
    expect(validateReferenceFiles([file('big.png', 'image/png', 11 * 1024 * 1024)])).toMatch(/10 MB/);
  });
  it('limits the number of files', () => {
    expect(validateReferenceFiles(Array.from({ length: 6 }, (_, i) => file(`${i}.png`, 'image/png')))).toMatch(/up to 5/);
  });
});

describe('toCustomOrderPayload', () => {
  it('converts strings to typed values and normalises email', () => {
    const payload = toCustomOrderPayload(valid);
    expect(payload.email).toBe('sam@example.com');
    expect(payload.quantity).toBe(1);
    expect(payload.dimensions).toEqual({ width: 140, depth: null, height: null, unit: 'cm', notes: null });
    expect(payload.budgetMin).toBeNull();
    expect(payload.preferredDate).toBeNull();
  });
});
