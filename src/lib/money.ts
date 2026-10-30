import { business } from '@/config/business';

/**
 * Money is stored as integer minor units (e.g. cents) everywhere: demo data,
 * the database, and quotations. This avoids floating-point rounding errors.
 */

const ISO_CODE = /^[A-Z]{3}$/;

/** Number of decimal places a currency uses (2 for USD, 0 for JPY, etc.). */
export function currencyFractionDigits(code: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Parses an amount typed by the owner ("1250", "1,250.50", "1250.5") into
 * integer minor units for the given currency. Returns null for anything that
 * isn't a valid non-negative amount with at most the currency's decimals.
 */
export function parseMoneyToMinor(input: string, currencyCode: string = business.currencyCode): number | null {
  const cleaned = input.trim().replace(/[\s,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const code = currencyCode.trim().toUpperCase();
  const digits = ISO_CODE.test(code) ? currencyFractionDigits(code) : 2;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  if (fraction.length > digits) return null;
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Inverse of parseMoneyToMinor, for prefilling inputs ("1250.50"). */
export function minorToInput(amountMinor: number, currencyCode: string = business.currencyCode): string {
  const code = currencyCode.trim().toUpperCase();
  const digits = ISO_CODE.test(code) ? currencyFractionDigits(code) : 2;
  return (amountMinor / 10 ** digits).toFixed(digits);
}

export function formatMoney(
  amountMinor: number,
  currencyCode: string = business.currencyCode,
  locale: string | undefined = business.locale,
): string {
  const code = currencyCode.trim().toUpperCase();
  if (ISO_CODE.test(code)) {
    try {
      const digits = currencyFractionDigits(code);
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(
        amountMinor / 10 ** digits,
      );
    } catch {
      // Unknown code: fall through to the unconfigured format.
    }
  }
  const plain = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
  return `${plain} (currency not set)`;
}
