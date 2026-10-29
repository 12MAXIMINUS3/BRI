import type { CategorySlug } from '@/config/catalog';
import { NotConnectedError } from '@/lib/errors';
import { DEMO_PRODUCTS } from './demo-data';
import type { Product } from './types';

/**
 * Product data access.
 *
 * PHASE 1: reads bundled demo data. Phase 2 replaces these with Supabase
 * queries (published products only, filtering and paging done in SQL).
 */

export interface ListProductsParams {
  search?: string;
  category?: CategorySlug;
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listProducts({
  search,
  category,
  inStockOnly,
  featuredOnly,
  page = 1,
  pageSize = 12,
}: ListProductsParams = {}): Promise<Paged<Product>> {
  const term = search?.trim().toLowerCase();
  const filtered = DEMO_PRODUCTS.filter(
    (p) =>
      (!category || p.category === category) &&
      (!inStockOnly || p.stockQuantity > 0) &&
      (!featuredOnly || p.featured) &&
      (!term || `${p.name} ${p.summary} ${p.materials.join(' ')}`.toLowerCase().includes(term)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length, page: safePage, pageCount };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export interface OrderRequestInput {
  productId: string;
  quantity: number;
  note?: string;
}

/**
 * NOT CONNECTED YET (Phase 3). Will call the `request_product_order` database
 * function, which reads the price from the database, reserves stock in a
 * transaction, and creates an order awaiting owner confirmation.
 */
export async function submitOrderRequest(_input: OrderRequestInput): Promise<{ orderId: string; reference: string }> {
  throw new NotConnectedError(
    'Online order requests are not connected yet. Please use the contact page to ask about this item.',
  );
}
