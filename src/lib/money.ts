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
