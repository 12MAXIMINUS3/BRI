import { usePageMeta } from '@/lib/usePageMeta';
import { WoodImage } from '@/components/media/WoodImage';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderCopy } from '@/components/ui/DemoLabel';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { HowItWorks } from '@/features/custom-orders/components/HowItWorks';
import { FeaturedWork } from '../components/FeaturedWork';
import { Hero } from '../components/Hero';
import { ShopPreview } from '../components/ShopPreview';
import { sitePhoto } from '@/config/images';

export function HomePage() {
  usePageMeta({
    description:
      'Custom furniture and woodwork made to order, with a clear quotation before work begins. Plus a small selection of ready-made pieces.',
  });

  return (
    <>
      <Hero />
      <FeaturedWork />

      <section aria-labelledby="how-heading" className="relative border-y border-gold-500/20 bg-ink-900">
        <Container className="py-20 sm:py-28">
          <SectionHeading
            id="how-heading"
            align="center"
            eyebrow="Custom orders"
            title={
              <>
                How custom orders <span className="text-gold-gradient italic">work</span>
              </>
            }
            description="A straightforward process with no surprises. You approve the scope and price before anything is made."
          />
          <HowItWorks className="mt-16" />
          <div className="mt-16 text-center">
            <ButtonLink to="/custom-order" size="lg">
              Request a Custom Order
            </ButtonLink>
          </div>
        </Container>
      </section>

      <ShopPreview />

      <section aria-labelledby="craft-heading" className="border-t border-ink-700 bg-ink-900">
        <Container className="grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-0 -translate-x-4 translate-y-4 rounded-sm border border-gold-500/40" />
              <WoodImage
                image={sitePhoto('home/craftsmanship', 'teak')}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="relative aspect-[4/5] rounded-sm shadow-card"
              />
            </div>
          </div>
          <div className="lg:col-span-7">
            <SectionHeading
              id="craft-heading"
              eyebrow="Craftsmanship"
              title={
                <>
                  Made by hand, <span className="text-gold-gradient italic">one piece at a time</span>
                </>
              }
            />
            <PlaceholderCopy className="prose-wood mt-8 text-lg leading-relaxed text-ivory-200">
              <p>
                Describe how you work: the tools and techniques you use, how you select timber, and the care that goes
                into each finish.
              </p>
              <p>Keep it factual. Avoid claims about years in business or awards unless you can back them up.</p>
            </PlaceholderCopy>
            <ButtonLink to="/about" variant="secondary" className="mt-10">
              About us
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section aria-labelledby="contact-cta-heading">
        <Container className="py-20 sm:py-28">
          <div className="relative overflow-hidden rounded-sm border border-gold-500/30 bg-ink-900 px-6 py-16 text-center sm:px-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl"
            />
            <p className="eyebrow relative">Questions first?</p>
            <h2 id="contact-cta-heading" className="relative mt-5 text-4xl text-balance sm:text-5xl">
              Not sure where to start?
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ivory-300">
              Send a quick question and we'll help you work out what's possible, or go straight to a custom request.
            </p>
            <div className="relative mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <ButtonLink to="/custom-order" size="lg">
                Request a Custom Order
              </ButtonLink>
              <ButtonLink to="/contact" size="lg" variant="secondary">
                Contact us
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
