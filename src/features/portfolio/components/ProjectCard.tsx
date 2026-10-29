import { Link } from 'react-router';
import { categoryLabel } from '@/config/catalog';
import { WoodImage } from '@/components/media/WoodImage';
import { DemoLabel } from '@/components/ui/DemoLabel';
import type { PortfolioProject } from '../types';

export function ProjectCard({ project, priority = false }: { project: PortfolioProject; priority?: boolean }) {
  return (
    <article className="group">
      <Link to={`/work/${project.slug}`} className="block rounded-2xl">
        <WoodImage
          image={project.images[0]}
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[4/5] rounded-2xl"
        />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wider text-mist-400 uppercase">
              {categoryLabel(project.category)}
            </p>
            <h3 className="mt-1 text-2xl transition-colors group-hover:text-gold-300">{project.title}</h3>
          </div>
          {project.isDemo && <DemoLabel className="mt-0.5" />}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ivory-300">{project.summary}</p>
      </Link>
    </article>
  );
}
