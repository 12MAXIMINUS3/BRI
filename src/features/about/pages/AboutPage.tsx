import { business } from '@/config/business';
import { usePageMeta } from '@/lib/usePageMeta';
import { WoodImage } from '@/components/media/WoodImage';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderCopy } from '@/components/ui/DemoLabel';

/**
 * All copy on this page is placeholder text for the owner to replace.
 * Phase 4 moves it into business settings so it can be edited without code.
 */
const VALUES = [
  {
    title: 'Clear quotations',
    body: 'Describe how you price work: what a quotation includes, how changes are handled, and when payment is due.',
  },
  {
    title: 'Materials chosen for the job',
    body: 'Explain how you choose timber and finishes, and where your materials come from if that matters to you.',
  },
  {
    title: 'Made to be used',
    body: 'Describe the joinery and construction methods you rely on, and how you want pieces to hold up over time.',
  },
];

export function AboutPage() {
  usePageMeta({
    title: 'About',
    description: `About ${business.name}: the people, approach, and values behind the work.`,
  });

  return (
    <>
      <section className="bg-ink-900">
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow">About</p>
            <h1 className="mt-3 text-5xl tracking-tight text-balance sm:text-6xl">About {business.name}</h1>
            <PlaceholderCopy className="mt-6 text-lg leading-relaxed text-ivory-300">
              <p>
                Introduce the business in two or three sentences: what you make, who you make it for, and where you
                work. Keep it specific and true. Visitors trust plain facts more than big claims.
              </p>
            </PlaceholderCopy>
          </div>
          <div className="lg:col-span-6">
            <WoodImage
              image={{ id: 'about-hero', url: null, alt: 'The workshop', tone: 'oak' }}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] rounded-2xl shadow-card"
            />
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <WoodImage
            image={{ id: 'about-owner', url: null, alt: 'Portrait of the owner at the workbench', tone: 'walnut' }}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="aspect-[4/5] rounded-2xl"
          />
        </div>
        <div className="lg:col-span-7 lg:pt-8">
          <p className="eyebrow">The maker</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Owner and craftsmanship</h2>
          <PlaceholderCopy className="prose-wood mt-6 text-lg leading-relaxed text-ivory-200">
            <p>
              Write a short introduction to the person or team behind the work: how you came to woodworking and what
              kind of work you enjoy most.
            </p>
            <p>
              Describe how you work with customers, from the first conversation through to delivery, and what they can
              expect at each stage.
            </p>
          </PlaceholderCopy>
        </div>
      </Container>

      <section aria-labelledby="values-heading" className="border-y border-ink-700 bg-ink-900">
        <Container className="py-16 sm:py-24">
          <p className="eyebrow">Approach</p>
          <h2 id="values-heading" className="mt-3 text-3xl sm:text-4xl">
            Values and approach
          </h2>
          <ul className="mt-12 grid gap-8 md:grid-cols-3">
            {VALUES.map((value) => (
              <li key={value.title}>
                <PlaceholderCopy className="h-full bg-ink-950">
                  <h3 className="text-xl">{value.title}</h3>
                  <p className="mt-3 leading-relaxed text-ivory-300">{value.body}</p>
                </PlaceholderCopy>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-16 text-center sm:py-24">
        <h2 className="text-3xl sm:text-4xl">Have something in mind?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ivory-300">
          Share your idea and we'll come back with questions or a quotation.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/custom-order" size="lg">
            Request a Custom Order
          </ButtonLink>
          <ButtonLink to="/shop" size="lg" variant="secondary">
            Shop Available Products
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
