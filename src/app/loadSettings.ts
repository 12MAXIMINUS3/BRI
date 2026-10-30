import { applyBusinessSettings, type BusinessSettingsRow } from '@/config/business';
import { supabase } from '@/lib/supabase';

/**
 * Loads business settings before the first render so every page shows the
 * owner's name, contact details, and currency. Gives up after 3 seconds and
 * keeps the env defaults, so a slow network never blocks the site.
 */
export async function loadBusinessSettings(): Promise<void> {
  if (!supabase) return;
  const query = supabase
    .from('business_settings')
    .select('business_name, tagline, contact_email, contact_phone, whatsapp_number, location, service_area, currency_code, locale')
    .maybeSingle<BusinessSettingsRow>();
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
  try {
    const result = await Promise.race([query, timeout]);
    if (result && !result.error && result.data) applyBusinessSettings(result.data);
  } catch {
    // Keep defaults.
  }
}
