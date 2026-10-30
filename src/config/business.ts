/**
 * Business details shown across the site.
 *
 * Phase 1 reads these from environment variables (see `.env.example`).
 * Phase 2 loads them from the `business_settings` table so the owner can edit
 * them in the admin dashboard; these values then act as fallbacks.
 *
 * Empty strings mean "not configured yet". The UI hides or labels them; it
 * never invents a phone number, address, or currency.
 */
const env = import.meta.env;

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

export interface BusinessConfig {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  /** Digits only, including country code. Empty hides the WhatsApp link. */
  whatsappNumber: string;
  location: string;
  serviceArea: string;
  /** ISO 4217 code. Empty means prices display without a currency symbol. */
  currencyCode: string;
  /** BCP 47 locale. Undefined uses the visitor's browser locale. */
  locale: string | undefined;
  showDemoLabels: boolean;
}

export const business: BusinessConfig = {
  name: clean(env.VITE_BUSINESS_NAME) || 'BuiltRight Interiors',
  tagline: 'Custom furniture and woodwork, made to order.',
  email: clean(env.VITE_CONTACT_EMAIL),
  phone: clean(env.VITE_CONTACT_PHONE),
  whatsappNumber: clean(env.VITE_WHATSAPP_NUMBER).replace(/\D/g, ''),
  location: clean(env.VITE_LOCATION),
  serviceArea: clean(env.VITE_SERVICE_AREA),
  currencyCode: clean(env.VITE_CURRENCY_CODE).toUpperCase(),
  locale: clean(env.VITE_LOCALE) || undefined,
  showDemoLabels: clean(env.VITE_SHOW_DEMO_LABELS) !== 'false',
};

export interface BusinessSettingsRow {
  business_name: string | null;
  tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  location: string | null;
  service_area: string | null;
  currency_code: string | null;
  locale: string | null;
}

/**
 * Applies settings saved in the database on top of the env defaults. Called
 * once at startup before the first render; empty database values keep the
 * env value so a half-filled settings row never blanks out the site.
 */
export function applyBusinessSettings(row: BusinessSettingsRow) {
  const pick = (value: string | null | undefined, fallback: string) => clean(value ?? undefined) || fallback;
  business.name = pick(row.business_name, business.name);
  business.tagline = pick(row.tagline, business.tagline);
  business.email = pick(row.contact_email, business.email);
  business.phone = pick(row.contact_phone, business.phone);
  business.whatsappNumber = pick(row.whatsapp_number, business.whatsappNumber).replace(/\D/g, '');
  business.location = pick(row.location, business.location);
  business.serviceArea = pick(row.service_area, business.serviceArea);
  business.currencyCode = pick(row.currency_code, business.currencyCode).toUpperCase();
  business.locale = pick(row.locale, business.locale ?? '') || undefined;
}

export function whatsappUrl(config: BusinessConfig = business): string | null {
  return config.whatsappNumber ? `https://wa.me/${config.whatsappNumber}` : null;
}
