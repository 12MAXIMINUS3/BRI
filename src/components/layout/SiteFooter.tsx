import { Link } from 'react-router';
import { business, whatsappUrl } from '@/config/business';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Logo } from './Logo';
import { PRIMARY_NAV } from './navigation';

const headingClass = 'font-sans text-[0.68rem] font-semibold tracking-[0.28em] text-gold-400 uppercase';
const linkClass = 'text-ivory-300 transition-colors hover:text-gold-300';

export function SiteFooter() {
  const whatsapp = whatsappUrl();
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-gold-500/25 bg-ink-950">
      <Container className="flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center">
        <p className="max-w-xl font-display text-3xl leading-tight text-ivory-50 sm:text-4xl">
          Have a piece in mind? <span className="text-gold-gradient italic">Let's make it.</span>
        </p>
        <ButtonLink to="/custom-order" size="lg">
          Request a Custom Order
        </ButtonLink>
      </Container>

      <div className="gold-rule" />

      <Container className="grid gap-12 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-sm leading-relaxed text-ivory-300">{business.tagline}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist-400">
            No payments are taken on this website. Prices, timelines, and payment arrangements are confirmed with you
            directly before any order goes ahead.
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className={headingClass}>Explore</h2>
          <ul className="mt-5 space-y-3">
            {[...PRIMARY_NAV, { to: '/custom-order', label: 'Request a Custom Order' }].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className={headingClass}>Get in touch</h2>
          <ul className="mt-5 space-y-3">
            {business.email && (
              <li>
                <a href={`mailto:${business.email}`} className={linkClass}>
                  {business.email}
                </a>
              </li>
            )}
            {business.phone && (
              <li>
                <a href={`tel:${business.phone.replace(/\s/g, '')}`} className={linkClass}>
                  {business.phone}
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {business.serviceArea && <li className="text-mist-400">Serving {business.serviceArea}</li>}
            <li>
              <Link to="/contact" className={linkClass}>
                Contact form
              </Link>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-ink-700">
        <Container className="flex flex-col gap-2 py-6 text-xs tracking-wide text-mist-400 sm:flex-row sm:justify-between">
          <p>
            © {year} {business.name}
          </p>
          {business.showDemoLabels && <p>Products, projects, and images shown are demo content.</p>}
        </Container>
      </div>
    </footer>
  );
}
