import { describe, expect, it } from 'vitest';
import { currencyFractionDigits, formatMoney, minorToInput, parseMoneyToMinor } from './money';

describe('parseMoneyToMinor', () => {
  it('converts typed amounts to minor units', () => {
    expect(parseMoneyToMinor('1250', 'USD')).toBe(125000);
    expect(parseMoneyToMinor('1,250.5', 'USD')).toBe(125050);
    expect(parseMoneyToMinor(' 0.99 ', 'USD')).toBe(99);
  });

  it('respects zero-decimal currencies', () => {
    expect(parseMoneyToMinor('1250', 'JPY')).toBe(1250);
    expect(parseMoneyToMinor('1250.5', 'JPY')).toBeNull();
  });

  it('rejects invalid input', () => {
    for (const bad of ['', '-5', 'abc', '1.234', '1e5', '12.']) {
      expect(parseMoneyToMinor(bad, 'USD')).toBeNull();
    }
  });

  it('round-trips with minorToInput', () => {
    expect(minorToInput(125050, 'USD')).toBe('1250.50');
    expect(parseMoneyToMinor(minorToInput(99, 'USD'), 'USD')).toBe(99);
  });
});

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
