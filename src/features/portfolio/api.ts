import type { CategorySlug } from '@/config/catalog';
import { catalogImageUrl, isMissingTable, supabase, toError } from '@/lib/supabase';
import type { MediaImage, WoodTone } from '@/types/media';
import { DEMO_PROJECTS } from './demo-data';
import type { PortfolioProject } from './types';

/**
 * Portfolio data access. Reads published projects from Supabase (Row Level
 * Security hides drafts and archived projects). Falls back to bundled demo
 * data only when Supabase isn't configured, e.g. in unit tests.
 */

export interface ListProjectsParams {
  category?: CategorySlug;
  featuredOnly?: boolean;
  limit?: number;
}

interface ImageRow {
  id: string;
  storage_path: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  tone: WoodTone;
  position: number;
}

interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  summary: string;
  description: string;
  materials: string[];
  finishes: string[];
  dimensions: string | null;
  featured: boolean;
  is_demo: boolean;
  portfolio_images: ImageRow[];
}

const PROJECT_COLUMNS =
  'id, slug, title, category, summary, description, materials, finishes, dimensions, featured, is_demo, portfolio_images (id, storage_path, alt, width, height, tone, position)';

export function toMediaImages(rows: ImageRow[]): MediaImage[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((img) => ({
      id: img.id,
      url: catalogImageUrl(img.storage_path),
      alt: img.alt,
      width: img.width ?? undefined,
      height: img.height ?? undefined,
      tone: img.tone,
    }));
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function toProject(row: ProjectRow): PortfolioProject {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    description: splitParagraphs(row.description),
    materials: row.materials,
    finishes: row.finishes,
    dimensions: row.dimensions,
    featured: row.featured,
    isDemo: row.is_demo,
    images: toMediaImages(row.portfolio_images ?? []),
  };
}

export async function listProjects({ category, featuredOnly, limit }: ListProjectsParams = {}): Promise<
  PortfolioProject[]
> {
  const demo = () => {
    let result = DEMO_PROJECTS;
    if (category) result = result.filter((p) => p.category === category);
    if (featuredOnly) result = result.filter((p) => p.featured);
    return limit ? result.slice(0, limit) : result;
  };
  if (!supabase) return demo();

  let query = supabase
    .from('portfolio_projects')
    .select(PROJECT_COLUMNS)
    .eq('status', 'published')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  if (featuredOnly) query = query.eq('featured', true);
  if (limit) query = query.limit(limit);

  const { data, error } = await query.returns<ProjectRow[]>();
  if (isMissingTable(error)) return demo();
  if (error) throw toError(error, 'Could not load projects.');
  return data.map(toProject);
}

export async function getProjectBySlug(slug: string): Promise<PortfolioProject | null> {
  if (!supabase) return DEMO_PROJECTS.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from('portfolio_projects')
    .select(PROJECT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle<ProjectRow>();
  if (isMissingTable(error)) return DEMO_PROJECTS.find((p) => p.slug === slug) ?? null;
  if (error) throw toError(error, 'Could not load this project.');
  return data ? toProject(data) : null;
}
