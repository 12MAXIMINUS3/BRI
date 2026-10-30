import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client. Uses the public anon key only; every table is
 * protected by Row Level Security. The service-role key must never be used
 * in frontend code.
 *
 * When the env vars are missing (e.g. in unit tests) the app falls back to
 * bundled demo data and form submissions report "not connected".
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

/** Public URL for an image in the `catalog-images` bucket. */
export function catalogImageUrl(path: string | null): string | null {
  if (!path) return null;
  // Paths starting with "/" are photos bundled with the site (e.g. the demo content's sample photos).
  if (path.startsWith('/')) return path;
  if (!supabase) return null;
  return supabase.storage.from('catalog-images').getPublicUrl(path).data.publicUrl;
}

/**
 * Public URL for a dashboard-managed site photo, logo, or video. Brand files
 * (keys starting with "brand/") live in the `site-media` bucket.
 */
export function siteMediaUrl(key: string, path: string | null): string | null {
  if (!key.startsWith('brand/')) return catalogImageUrl(path);
  if (!path) return null;
  if (path.startsWith('/')) return path;
  if (!supabase) return null;
  return supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl;
}

/** Turns a PostgREST/Postgres error into a plain Error with a readable message. */
export function toError(error: { message: string } | null | undefined, fallback = 'Something went wrong.'): Error {
  return new Error(error?.message || fallback);
}

/**
 * True when the database hasn't been set up yet (the table doesn't exist).
 * Public pages then show the bundled demo content instead of an error.
 */
export function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

/** Generates an idempotency key for one submission attempt. */
export function newClientToken(): string {
  return crypto.randomUUID();
}
