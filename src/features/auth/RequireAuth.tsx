import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { LoadingState } from '@/components/ui/States';
import { useAuth } from './AuthProvider';
import { signInPath } from './redirect';

/** Sends signed-out visitors to sign in, then back to this page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingState className="py-32" />;
  if (!user) return <Navigate to={signInPath(location.pathname + location.search)} replace />;
  return <>{children}</>;
}
