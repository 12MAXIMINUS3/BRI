import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Dialog } from '@/components/ui/Dialog';
import { MenuIcon } from '@/components/ui/icons';
import { Logo } from './Logo';
import { PRIMARY_NAV } from './navigation';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative rounded-sm px-1 py-2 text-[0.72rem] font-semibold tracking-[0.2em] uppercase transition-colors',
    isActive ? 'text-gold-300' : 'text-ivory-300 hover:text-gold-300',
    'after:absolute after:inset-x-1 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold-500 after:transition-transform after:duration-300',
    isActive ? 'after:scale-x-100' : 'after:scale-x-0',
  );

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-gold-500/20 bg-ink-950/85 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink to="/custom-order" size="sm" className="hidden sm:inline-flex">
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
            {[{ to: '/', label: 'Home' }, ...PRIMARY_NAV].map((item) => (
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
