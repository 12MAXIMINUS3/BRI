import type { CategorySlug } from '@/config/catalog';
import { DEMO_PROJECTS } from './demo-data';
import type { PortfolioProject } from './types';

/**
 * Portfolio data access.
 *
 * PHASE 1: reads the bundled demo data. Phase 2 replaces these function bodies
 * with Supabase queries that only return published projects (enforced by
 * Row Level Security), keeping the same signatures so pages don't change.
 */

export interface ListProjectsParams {
  category?: CategorySlug;
  featuredOnly?: boolean;
  limit?: number;
}

export async function listProjects({ category, featuredOnly, limit }: ListProjectsParams = {}): Promise<
  PortfolioProject[]
> {
  let result = DEMO_PROJECTS;
  if (category) result = result.filter((p) => p.category === category);
  if (featuredOnly) result = result.filter((p) => p.featured);
  return limit ? result.slice(0, limit) : result;
}

export async function getProjectBySlug(slug: string): Promise<PortfolioProject | null> {
  return DEMO_PROJECTS.find((p) => p.slug === slug) ?? null;
}
