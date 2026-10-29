import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ProjectCard } from '@/features/portfolio/components/ProjectCard';
import { useProjects } from '@/features/portfolio/hooks';

export function FeaturedWork() {
  const { data, isPending, isError, refetch } = useProjects({ featuredOnly: true, limit: 3 });

  return (
    <section aria-labelledby="featured-work-heading">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          id="featured-work-heading"
          eyebrow="Our work"
          title="Recent projects"
          description="Examples of past commissions. Each was made to order, so use them as a starting point for your own."
          action={
            <ButtonLink to="/work" variant="secondary">
              View all work
            </ButtonLink>
          }
        />
        <div className="mt-12">
          {isPending ? (
            <LoadingState label="Loading projects…" />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
