import { describe, expect, it } from 'vitest';
import { currencyFractionDigits, formatMoney } from './money';

describe('formatMoney', () => {
  it('formats minor units in the configured currency', () => {
    expect(formatMoney(125000, 'USD', 'en-US')).toBe('$1,250.00');
  });

  it('respects currencies without decimal places', () => {
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(formatMoney(1250, 'JPY', 'en-US')).toBe('¥1,250');
  });

  it('never guesses a currency when none is configured', () => {
    expect(formatMoney(1250, '', 'en-US')).toBe('12.50 (currency not set)');
    expect(formatMoney(1250, 'not-a-code', 'en-US')).toBe('12.50 (currency not set)');
  });
});
