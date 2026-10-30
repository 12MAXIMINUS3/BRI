import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthProvider';
import { signInPath } from '@/features/auth/redirect';

/**
 * Keeps non-admins out of the dashboard UI. This is a convenience only: the
 * real protection is Row Level Security, which refuses admin reads and
 * writes from any account that isn't an administrator.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { ready, user, profileReady, isAdmin } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <Container className="max-w-xl py-28 text-center">
        <h1 className="text-4xl">Dashboard unavailable</h1>
        <p className="mt-4 text-ivory-300">The website isn't connected to its database yet.</p>
      </Container>
    );
  }
  if (!ready || (user && !profileReady)) return <LoadingState className="py-32" label="Checking access…" />;
  if (!user) return <Navigate to={signInPath(location.pathname + location.search)} replace />;
  if (!isAdmin) {
    return (
      <Container className="max-w-xl py-28 text-center">
        <p className="eyebrow">Restricted</p>
        <h1 className="mt-4 text-4xl">Administrators only</h1>
        <p className="mt-4 text-ivory-300">
          You're signed in as {user.email}, which doesn't have access to the dashboard.
        </p>
        <ButtonLink to="/" variant="secondary" className="mt-8">
          Back to the website
        </ButtonLink>
      </Container>
    );
  }
  return <>{children}</>;
}
