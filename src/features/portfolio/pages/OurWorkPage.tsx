import { useSearchParams } from 'react-router';
import { CATEGORIES, isCategorySlug } from '@/config/catalog';
import { usePageMeta } from '@/lib/usePageMeta';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { FilterChips } from '@/components/ui/FilterChips';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { VideoHeader } from '@/components/media/VideoHeader';
import { ProjectCard } from '../components/ProjectCard';
import { useProjects } from '../hooks';

export function OurWorkPage() {
  usePageMeta({
    title: 'Our Work',
    description: 'Examples of past custom furniture and woodwork projects, from dining tables to fitted cabinetry.',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category');
  const category = isCategorySlug(rawCategory) ? rawCategory : undefined;
  const { data: projects, isPending, isError, refetch } = useProjects({ category });

  const setCategory = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <VideoHeader>
        <Container className="py-16 sm:py-20">
          <SectionHeading
            as="h1"
            eyebrow="Portfolio"
            title="Our Work"
            description="A selection of past projects. Every piece here was made to order, so these are examples of what's possible rather than items in stock."
          />
          <Alert className="mt-8 max-w-2xl" title="Looking for something you can buy now?">
            Ready-made pieces with prices and stock levels are in the shop. If you like a project here, use{' '}
            <strong>Request Something Similar</strong> on its page and we'll quote for a version made for you.
          </Alert>
        </Container>
      </VideoHeader>

      <Container className="py-12 sm:py-16">
        <FilterChips
          label="Filter projects by category"
          value={category ?? 'all'}
          onChange={setCategory}
          options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))]}
        />

        <div className="mt-10" aria-live="polite">
          {isPending ? (
            <LoadingState label="Loading projects…" />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : projects.length === 0 ? (
            <EmptyState
              title="No projects in this category yet"
              message="We may still be able to make it. Tell us what you have in mind."
              action={<ButtonLink to="/custom-order">Request a Custom Order</ButtonLink>}
            />
          ) : (
            <>
              <p className="sr-only">{projects.length} projects shown</p>
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, i) => (
                  <ProjectCard key={project.id} project={project} priority={i < 3} />
                ))}
              </div>
            </>
          )}
        </div>
      </Container>
    </>
  );
}
