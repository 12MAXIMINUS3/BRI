import { Link } from 'react-router';
import { categoryLabel, DEPARTMENTS } from '@/config/catalog';
import { usePageMeta } from '@/lib/usePageMeta';
import { VideoHeader } from '@/components/media/VideoHeader';
import { WoodImage } from '@/components/media/WoodImage';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderCopy } from '@/components/ui/DemoLabel';
import { ArrowRightIcon } from '@/components/ui/icons';
import type { WoodTone } from '@/types/media';

/** Sample photo for each furniture type (replace with the business's own photos). */
const PHOTOS: Record<string, { file: string; alt: string; tone: WoodTone }> = {
  tables: { file: 'dining-table-view', alt: 'Wooden dining table by a window', tone: 'walnut' },
  seating: { file: 'armchair', alt: 'Wooden armchair with a cushion', tone: 'ash' },
  storage: { file: 'bookshelf', alt: 'Wall of wooden bookshelves', tone: 'oak' },
  cabinetry: { file: 'kitchen', alt: 'Kitchen with fitted cabinets and an island', tone: 'maple' },
  beds: { file: 'bedroom', alt: 'Bright bedroom', tone: 'cherry' },
  outdoor: { file: 'outdoor-table', alt: 'Wooden outdoor table with stools', tone: 'teak' },
  decor: { file: 'cutting-board-herbs', alt: 'Wooden board with herbs and spices', tone: 'walnut' },
  other: { file: 'wood-planks', alt: 'Wooden planks', tone: 'oak' },
};

const photo = (slug: string) => {
  const p = PHOTOS[slug];
  return p
    ? { id: `cat-${slug}`, url: `/images/stock/${p.file}-1400.webp`, alt: p.alt, tone: p.tone }
    : { id: `cat-${slug}`, url: null, alt: categoryLabel(slug), tone: 'oak' as const };
};

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
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {interior.categories.map((slug) => (
                  <li key={slug}>
                    <Link
                      to={`/work?category=${slug}`}
                      className="flex items-center justify-between rounded-sm border border-ink-700 px-4 py-3 hover:border-gold-500/60"
                    >
                      {categoryLabel(slug)}
                      <ArrowRightIcon className="size-4 text-gold-400" />
                    </Link>
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
                image={{
                  id: 'cat-interior',
                  url: '/images/stock/modern-living-room-1400.webp',
                  alt: 'Living room with an armchair and sofa',
                  tone: 'walnut',
                }}
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
