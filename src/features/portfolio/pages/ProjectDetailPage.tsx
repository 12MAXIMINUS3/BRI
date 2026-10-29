import { Link, useParams } from 'react-router';
import { categoryLabel } from '@/config/catalog';
import { usePageMeta } from '@/lib/usePageMeta';
import { ImageGallery } from '@/components/media/ImageGallery';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { DemoLabel } from '@/components/ui/DemoLabel';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { ProjectCard } from '../components/ProjectCard';
import { useProject, useProjects } from '../hooks';

export function ProjectDetailPage() {
  const { slug } = useParams();
  const { data: project, isPending, isError, refetch } = useProject(slug);
  const related = useProjects({ category: project?.category });

  usePageMeta({
    title: project?.title ?? 'Project',
    description: project?.summary ?? 'A past custom woodworking project.',
  });

  if (isPending) return <LoadingState label="Loading project…" className="py-32" />;
  if (isError) return <ErrorState onRetry={() => refetch()} className="py-32" />;
  if (!project) {
    return (
      <Container className="py-24">
        <EmptyState
          title="Project not found"
          message="It may have been moved or archived."
          action={<ButtonLink to="/work">Back to Our Work</ButtonLink>}
        />
      </Container>
    );
  }

  const relatedProjects = (related.data ?? []).filter((p) => p.id !== project.id).slice(0, 3);

  return (
    <>
      <Container className="pt-8 pb-16 sm:pt-12">
        <Link to="/work" className="inline-flex items-center gap-2 text-sm font-medium text-gold-400 hover:text-ivory-50">
          <ArrowLeftIcon className="size-4" />
          All projects
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <ImageGallery images={project.images} title={project.title} />
          </div>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{categoryLabel(project.category)}</p>
              {project.isDemo && <DemoLabel>Demo project</DemoLabel>}
            </div>
            <h1 className="mt-3 text-5xl tracking-tight text-balance sm:text-6xl">{project.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-ivory-300">{project.summary}</p>

            <dl className="mt-8 divide-y divide-ink-700 border-y border-ink-700">
              <DetailRow label="Materials" value={project.materials.join(', ')} />
              <DetailRow label="Finish" value={project.finishes.join(', ')} />
              {project.dimensions && <DetailRow label="Dimensions" value={project.dimensions} />}
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={`/custom-order?project=${encodeURIComponent(project.slug)}`} size="lg">
                Request Something Similar
              </ButtonLink>
            </div>
            <Alert className="mt-6">
              This is an example of past work, not an item in stock. Requesting something similar starts a custom
              order: we'll review your requirements and send a quotation before anything is confirmed.
            </Alert>

            <div className="prose-wood mt-10 leading-relaxed text-ivory-200">
              <h2 className="mb-4 text-2xl">About this project</h2>
              {project.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {relatedProjects.length > 0 && (
        <section aria-labelledby="related-heading" className="border-t border-ink-700 bg-ink-900">
          <Container className="py-16">
            <h2 id="related-heading" className="text-3xl">
              More {categoryLabel(project.category).toLowerCase()}
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4">
      <dt className="text-sm font-medium text-mist-400">{label}</dt>
      <dd className="col-span-2 text-ivory-50">{value}</dd>
    </div>
  );
}
