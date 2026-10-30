import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Dialog } from '@/components/ui/Dialog';
import { MenuIcon } from '@/components/ui/icons';
import { Logo } from './Logo';
import { PRIMARY_NAV } from './navigation';

/** Main navigation: bordered tabs with a 10px radius. */
const mainNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-[10px] border px-3 py-2 text-[0.72rem] font-semibold tracking-[0.16em] uppercase transition-colors',
    isActive
      ? 'border-gold-500 bg-gold-500/10 text-gold-300'
      : 'border-gold-500/20 text-ivory-300 hover:border-gold-500/60 hover:text-gold-300',
  );

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, isAdmin } = useAuth();

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="site-header sticky top-0 z-40 border-b border-gold-500/20 bg-ink-950/85 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex lg:translate-x-10">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={mainNavClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <NavLink to="/admin" className={(s) => cn(mainNavClass(s), 'hidden md:inline-block')}>
              Dashboard
            </NavLink>
          )}
          {isSupabaseConfigured && (
            <NavLink to={user ? '/account' : '/sign-in'} className={(s) => cn(mainNavClass(s), 'hidden md:inline-block')}>
              {user ? 'My Account' : 'Sign In'}
            </NavLink>
          )}
          <ButtonLink to="/custom-order" size="sm" className="rounded-[10px]! max-sm:hidden!">
            Request a Custom Order
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="grid size-11 place-items-center rounded-full text-ivory-50 hover:bg-ink-800 lg:hidden"
          >
            <MenuIcon className="size-6" />
            <span className="sr-only">Open menu</span>
          </button>
        </div>
      </Container>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" variant="drawer">
        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {[
              { to: '/', label: 'Home' },
              ...PRIMARY_NAV,
              ...(isAdmin ? [{ to: '/admin', label: 'Dashboard' }] : []),
              ...(isSupabaseConfigured ? [{ to: user ? '/account' : '/sign-in', label: user ? 'My Account' : 'Sign In' }] : []),
            ].map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'block border-b border-ink-700 px-1 py-4 font-display text-3xl',
                      isActive ? 'text-gold-300' : 'text-ivory-50 hover:text-gold-300',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 grid gap-3">
          <ButtonLink to="/custom-order">Request a Custom Order</ButtonLink>
          <ButtonLink to="/shop" variant="secondary">
            Shop Available Products
          </ButtonLink>
        </div>
      </Dialog>
    </header>
  );
}
