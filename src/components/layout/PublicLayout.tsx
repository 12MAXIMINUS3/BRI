import { Suspense, useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { business } from '@/config/business';
import { LoadingState } from '@/components/ui/States';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function PublicLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new page's content after client-side navigation so
  // keyboard and screen-reader users start at the top of the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-gold-500 px-5 py-3 font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      {business.showDemoLabels && (
        <p className="border-b border-gold-500/20 bg-ink-900 px-4 py-2 text-center text-[0.7rem] tracking-wide text-gold-300 sm:text-xs">
          Preview site: products, projects, and images are demo content, not verified work by this business.
        </p>
      )}
      <SiteHeader />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<LoadingState className="py-32" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}
