import { Suspense } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { usePageMeta } from '@/lib/usePageMeta';
import { LoadingState } from '@/components/ui/States';
import { LogoMark, useCustomLogo } from '@/components/layout/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { getOverviewCounts } from './api/misc';
import { adminKeys } from './keys';

const NAV = [
  { to: '/admin', label: 'Overview', end: true, badge: null },
  { to: '/admin/requests', label: 'Requests', badge: 'newRequests' },
  { to: '/admin/orders', label: 'Orders', badge: 'pendingOrders' },
  { to: '/admin/products', label: 'Products', badge: 'lowStock' },
  { to: '/admin/portfolio', label: 'Portfolio', badge: null },
  { to: '/admin/photos', label: 'Logo & Photos', badge: null },
  { to: '/admin/inquiries', label: 'Messages', badge: 'newInquiries' },
  { to: '/admin/customers', label: 'Customers', badge: null },
  { to: '/admin/settings', label: 'Settings', badge: null },
] as const;

export function AdminLayout() {
  usePageMeta({ title: 'Dashboard', description: 'Admin dashboard', noIndex: true });
  const { profile, user, signOut } = useAuth();
  const customLogoImage = useCustomLogo();
  // Refreshes every minute so new activity shows up without reloading.
  const counts = useQuery({ queryKey: adminKeys.counts(), queryFn: getOverviewCounts, refetchInterval: 60_000 });

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-sm bg-gold-500 px-5 py-3 font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-gold-500/20 bg-ink-950/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/admin" className="flex items-center gap-3">
            {customLogoImage ? (
              <img src={customLogoImage.url} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
            ) : (
              <LogoMark className="size-9" />
            )}
            <span className="leading-tight">
              <span className="block font-brand text-sm font-semibold tracking-wider text-gold-300">BUILTRIGHT</span>
              <span className="block text-[0.65rem] tracking-[0.3em] text-mist-400 uppercase">Dashboard</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-mist-400 md:inline">{profile?.full_name || user?.email}</span>
            <Link to="/" className="text-gold-300 hover:underline">
              View site
            </Link>
            <button type="button" onClick={() => void signOut()} className="text-ivory-300 hover:text-gold-300">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Dashboard"
          className="border-b border-ink-700 bg-ink-900 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0"
        >
          <ul className="flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-16 lg:flex-col lg:p-4">
            {NAV.map((item) => {
              const badge = item.badge && counts.data ? counts.data[item.badge] : 0;
              return (
                <li key={item.to} className="shrink-0">
                  <NavLink
                    to={item.to}
                    end={'end' in item ? item.end : false}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'bg-gold-500/15 text-gold-200' : 'text-ivory-300 hover:bg-ink-800 hover:text-ivory-50',
                      )
                    }
                  >
                    {item.label}
                    {badge > 0 && (
                      <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[0.7rem] font-semibold text-ink-950">
                        {badge}
                        <span className="sr-only"> need attention</span>
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 focus:outline-none sm:px-8 lg:py-10">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <ScrollRestoration />
    </div>
  );
}
