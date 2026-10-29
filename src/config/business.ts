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
  name: clean(env.VITE_BUSINESS_NAME) || 'Woodcraft Studio',
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

export function whatsappUrl(config: BusinessConfig = business): string | null {
  return config.whatsappNumber ? `https://wa.me/${config.whatsappNumber}` : null;
}
