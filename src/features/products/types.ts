import type { CategorySlug } from '@/config/catalog';
import type { MediaImage } from '@/types/media';

/**
 * A ready-made item with a fixed price and stock. Mirrors the Phase 2
 * `products` and `product_images` tables. Prices are integer minor units.
 */
export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  summary: string;
  description: string[];
  priceMinor: number;
  /** Units available to request. Reserved/confirmed units are already subtracted. */
  stockQuantity: number;
  materials: string[];
  finish: string;
  dimensions: string | null;
  images: MediaImage[];
  featured: boolean;
  isDemo: boolean;
}
