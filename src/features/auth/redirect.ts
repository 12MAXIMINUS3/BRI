/**
 * Builds and reads the `?next=` parameter used to return customers to what
 * they were doing after signing in. Only same-site paths are accepted, so the
 * parameter can't be abused to redirect visitors to another website.
 */
export function signInPath(next: string, mode: 'sign-in' | 'register' = 'sign-in'): string {
  return `/${mode}?next=${encodeURIComponent(next)}`;
}

export function safeNext(value: string | null | undefined, fallback = '/account'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
