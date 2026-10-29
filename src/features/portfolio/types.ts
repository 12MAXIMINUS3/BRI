import type { CategorySlug } from '@/config/catalog';
import type { MediaImage } from '@/types/media';

/**
 * A past project shown as an example of the workshop's work.
 * Not something customers can buy directly. Mirrors the Phase 2
 * `portfolio_projects` and `portfolio_images` tables.
 */
export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  summary: string;
  description: string[];
  materials: string[];
  finishes: string[];
  /** Free-text dimensions, e.g. "W 2200 × D 950 × H 750 mm". */
  dimensions: string | null;
  images: MediaImage[];
  featured: boolean;
  /** Sample entry that must not be presented as real work. */
  isDemo: boolean;
}
