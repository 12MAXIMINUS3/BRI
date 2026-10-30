import { Link } from 'react-router';
import { categoryLabel, DEPARTMENTS, type CategorySlug } from '@/config/catalog';
import { sitePhoto } from '@/config/images';
import { usePageMeta } from '@/lib/usePageMeta';
import { VideoHeader } from '@/components/media/VideoHeader';
import { WoodImage } from '@/components/media/WoodImage';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderCopy } from '@/components/ui/DemoLabel';
import { ArrowRightIcon } from '@/components/ui/icons';

/** Photo for each furniture type. Change them in src/config/images.ts. */
const photo = (slug: CategorySlug) => sitePhoto(`categories/${slug}`);

export function CategoriesPage() {
  usePageMeta({
    title: 'Categories',
    description: 'Browse our two specialities: interior design and handmade furniture.',
  });
  const [interior, furniture] = DEPARTMENTS;

  return (
    <>
      <VideoHeader>
        <Container className="py-16 sm:py-24">
          <p className="eyebrow">What we do</p>
          <h1 className="mt-4 max-w-3xl text-5xl text-balance sm:text-6xl">
            Two crafts, <span className="text-gold-gradient italic">one standard.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ivory-300">
            Choose where to start: a complete interior designed around your space, or individual pieces of furniture.
          </p>
          <nav aria-label="Categories" className="mt-10 flex flex-wrap gap-3">
            {DEPARTMENTS.map((d) => (
              <a
                key={d.slug}
                href={`#${d.slug}`}
                className="rounded-[10px] border border-gold-500/50 px-5 py-3 text-xs font-semibold tracking-[0.16em] text-gold-300 uppercase hover:bg-gold-500/10"
              >
                {d.label}
              </a>
            ))}
          </nav>
        </Container>
      </VideoHeader>

      {/* Interior design */}
      <section id={interior.slug} aria-labelledby={`${interior.slug}-heading`} className="scroll-mt-24 border-b border-ink-700">
        <Container className="grid items-center gap-12 py-20 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow">01 · Category</p>
            <h2 id={`${interior.slug}-heading`} className="mt-4 text-5xl">
              {interior.label}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ivory-300">{interior.description}</p>
            {interior.categories.length > 0 ? (
              <ul className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Interior design services">
                {interior.categories.map((slug) => (
                  <li key={slug}>
                    <article className="group h-full rounded-sm border border-ink-700 bg-ink-850 transition-colors hover:border-gold-500/50">
                      <Link to={`/custom-order?category=${slug}`} className="block">
                        <WoodImage image={photo(slug)} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] rounded-t-sm" />
                        <h3 className="flex items-center justify-between gap-3 px-4 pt-4 text-2xl group-hover:text-gold-300">
                          {categoryLabel(slug)}
                          <ArrowRightIcon className="size-4 shrink-0 text-gold-400 transition-transform group-hover:translate-x-1" />
                        </h3>
                      </Link>
                      <p className="flex gap-4 px-4 pt-2 pb-4 text-sm">
                        <Link to={`/custom-order?category=${slug}`} className="text-gold-300 hover:underline">
                          Request this service
                        </Link>
                        <Link to={`/work?category=${slug}`} className="text-ivory-300 hover:text-gold-300 hover:underline">
                          Past work
                        </Link>
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <PlaceholderCopy className="mt-8 text-ivory-300">
                <p>Our interior design services will be listed here.</p>
              </PlaceholderCopy>
            )}
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink to="/custom-order">Request a Design Consultation</ButtonLink>
              <ButtonLink to="/work" variant="secondary">
                See Our Work
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rounded-sm border border-gold-500/40" />
              <WoodImage
                image={sitePhoto('categories/interior-design', 'walnut')}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="relative aspect-[4/3] rounded-sm shadow-card"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Furniture */}
      <section id={furniture.slug} aria-labelledby={`${furniture.slug}-heading`} className="scroll-mt-24 bg-ink-900">
        <Container className="py-20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">02 · Category</p>
              <h2 id={`${furniture.slug}-heading`} className="mt-4 text-5xl">
                {furniture.label}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ivory-300">{furniture.description}</p>
            </div>
            <ButtonLink to="/shop" variant="secondary">
              Shop All Furniture
            </ButtonLink>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {furniture.categories.map((slug) => (
              <li key={slug}>
                <article className="group h-full rounded-sm border border-ink-700 bg-ink-850 transition-colors hover:border-gold-500/50">
                  <Link to={`/shop?category=${slug}`} className="block">
                    <WoodImage image={photo(slug)} sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[4/3] rounded-t-sm" />
                    <h3 className="flex items-center justify-between px-4 pt-4 text-2xl group-hover:text-gold-300">
                      {categoryLabel(slug)}
                      <ArrowRightIcon className="size-4 text-gold-400 transition-transform group-hover:translate-x-1" />
                    </h3>
                  </Link>
                  <p className="flex gap-4 px-4 pt-2 pb-4 text-sm">
                    <Link to={`/shop?category=${slug}`} className="text-gold-300 hover:underline">
                      Shop
                    </Link>
                    <Link to={`/work?category=${slug}`} className="text-ivory-300 hover:text-gold-300 hover:underline">
                      Past work
                    </Link>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
