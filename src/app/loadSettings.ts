import { applyBusinessSettings, type BusinessSettingsRow } from '@/config/business';
import { applySitePhotoOverrides } from '@/config/images';
import { catalogImageUrl, supabase } from '@/lib/supabase';

/**
 * Loads business settings and the owner's replacement site photos before the
 * first render, so every page shows the right name, contact details, currency,
 * and photos. Gives up after 3 seconds and keeps the defaults, so a slow
 * network never blocks the site.
 */
export async function loadBusinessSettings(): Promise<void> {
  if (!supabase) return;
  const settings = supabase
    .from('business_settings')
    .select('business_name, tagline, contact_email, contact_phone, whatsapp_number, location, service_area, currency_code, locale')
    .maybeSingle<BusinessSettingsRow>();
  const photos = supabase.from('site_photos').select('key, storage_path, alt');
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
  try {
    const result = await Promise.race([Promise.all([settings, photos]), timeout]);
    if (!result) return;
    const [s, p] = result;
    if (!s.error && s.data) applyBusinessSettings(s.data);
    if (!p.error && p.data) {
      applySitePhotoOverrides(p.data.map((row) => ({ key: row.key, url: catalogImageUrl(row.storage_path), alt: row.alt })));
    }
  } catch {
    // Keep defaults.
  }
}
