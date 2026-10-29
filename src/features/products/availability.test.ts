import { describe, expect, it } from 'vitest';
import { clampQuantity, getAvailability } from './availability';

describe('getAvailability', () => {
  it('reports out of stock at zero or below', () => {
    expect(getAvailability(0).status).toBe('out_of_stock');
    expect(getAvailability(-3).status).toBe('out_of_stock');
  });

  it('flags low stock', () => {
    expect(getAvailability(2)).toMatchObject({ status: 'low_stock', label: 'Only 2 left', maxQuantity: 2 });
  });

  it('reports in stock above the threshold', () => {
    expect(getAvailability(7)).toMatchObject({ status: 'in_stock', maxQuantity: 7 });
  });
});

describe('clampQuantity', () => {
  it('cannot request more than is in stock', () => {
    expect(clampQuantity(10, 3)).toBe(3);
  });

  it('requires at least one unit', () => {
    expect(clampQuantity(0, 3)).toBe(1);
    expect(clampQuantity(-5, 3)).toBe(1);
    expect(clampQuantity(Number.NaN, 3)).toBe(1);
  });

  it('returns zero when nothing is available', () => {
    expect(clampQuantity(1, 0)).toBe(0);
  });
});
