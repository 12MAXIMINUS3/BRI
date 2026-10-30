import { business } from '@/config/business';

/** Formats an ISO date or timestamp for display, e.g. "30 Oct 2026". */
export function formatDate(value: string): string {
  // Plain dates (YYYY-MM-DD) are parsed as local dates to avoid time-zone shifts.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(business.locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
