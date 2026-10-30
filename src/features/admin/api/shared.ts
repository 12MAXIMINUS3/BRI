import { requireSupabase, toError } from '@/lib/supabase';

/**
 * Admin data access. Every query here runs as the signed-in user; Row Level
 * Security only lets administrators read or change these records, so a
 * non-admin calling these functions simply gets nothing back.
 */
export const db = () => requireSupabase();

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

export const ADMIN_PAGE_SIZE = 20;

export function pageRange(page: number, pageSize = ADMIN_PAGE_SIZE): [number, number] {
  const from = (Math.max(1, page) - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function toPage<T>(items: T[] | null, count: number | null, page: number, pageSize = ADMIN_PAGE_SIZE): Page<T> {
  const total = count ?? items?.length ?? 0;
  return { items: items ?? [], total, page: Math.max(1, page), pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export function check<T>(result: { data: T; error: { message: string } | null }, fallback: string): T {
  if (result.error) throw toError(result.error, fallback);
  return result.data;
}

/** Escapes characters with meaning in PostgREST `or` filters and LIKE patterns. */
export function searchTerm(value: string | undefined): string {
  return (value ?? '').replace(/[%_\\,()*"]/g, ' ').trim();
}
