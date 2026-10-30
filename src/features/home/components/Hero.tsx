import { Link } from 'react-router';
import { VideoHeader } from '@/components/media/VideoHeader';
import { WoodImage } from '@/components/media/WoodImage';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ArrowRightIcon } from '@/components/ui/icons';

const PATHS = [
  {
    to: '/work',
    label: 'Our Work',
    body: 'Past commissions, shown as examples of what we can make.',
  },
  {
    to: '/custom-order',
    label: 'Custom Orders',
    body: 'Describe your piece. We review it and send a quotation.',
  },
  {
    to: '/shop',
    label: 'Ready-made',
    body: 'A small selection of finished pieces with set prices.',
  },
] as const;

export function Hero() {
  return (
    <VideoHeader className="border-b-0">
      {/* Soft gold glow behind the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-[38rem] rounded-full bg-gold-500/10 blur-3xl"
      />

      <Container className="relative grid items-center gap-16 pt-16 pb-20 sm:pt-24 lg:grid-cols-12 lg:gap-12 lg:pt-28 lg:pb-28">
        <div className="lg:col-span-6">
          <p className="eyebrow">Bespoke woodwork · Made to order</p>
          <h1 className="mt-7 text-[3rem] leading-[0.98] text-balance sm:text-7xl lg:text-[5.5rem]">
            Furniture crafted <span className="text-gold-gradient italic">around you.</span>
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-ivory-300">
            Tell us what you have in mind. We'll review your requirements, advise on materials and finishes, and send
            a clear quotation before any work begins.
          </p>
          <div className="mt-11 flex flex-col gap-4 sm:flex-row">
            <ButtonLink to="/custom-order" size="lg">
              Request a Custom Order
            </ButtonLink>
            <ButtonLink to="/shop" size="lg" variant="secondary">
              Shop Available Products
            </ButtonLink>
          </div>
          <p className="mt-7 text-sm text-mist-400">
            Sending a request doesn't commit you to anything. You decide once you've seen the quotation.
          </p>
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative mx-auto max-w-lg lg:ml-auto">
            {/* Offset gold frame */}
            <div aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rounded-sm border border-gold-500/50" />
            <WoodImage
              image={{ id: 'hero-1', url: null, alt: 'A finished walnut dining table', tone: 'walnut' }}
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="relative aspect-[4/5] rounded-sm shadow-card"
            />
            <div className="absolute -bottom-8 -left-6 hidden w-44 sm:block">
              <WoodImage
                image={{ id: 'hero-2', url: null, alt: 'Hand-cut joinery detail', tone: 'oak' }}
                sizes="180px"
                className="aspect-square rounded-sm border-4 border-ink-950 shadow-card"
              />
            </div>
          </div>
        </div>
      </Container>

      <div className="gold-rule" />
      <Container>
        <ul className="grid divide-y divide-ink-700 md:grid-cols-3 md:divide-x md:divide-y-0">
          {PATHS.map((path, i) => (
            <li key={path.to}>
              <Link
                to={path.to}
                className="group flex h-full items-start gap-5 px-2 py-8 transition-colors hover:bg-ink-900 md:px-8"
              >
                <span className="font-display text-3xl text-gold-500/70">0{i + 1}</span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.2em] text-ivory-50 uppercase">
                    {path.label}
                    <ArrowRightIcon className="size-4 text-gold-400 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-mist-400">{path.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
      <div className="gold-rule" />
    </VideoHeader>
  );
}
