import type { CategorySlug } from '@/config/catalog';
import { NotConnectedError } from '@/lib/errors';
import { isMissingTable, requireSupabase, supabase, toError } from '@/lib/supabase';
import type { WoodTone } from '@/types/media';
import { splitParagraphs, toMediaImages } from '@/features/portfolio/api';
import { DEMO_PRODUCTS } from './demo-data';
import type { Product } from './types';

/**
 * Product data access. Reads published products from Supabase, with search,
 * filtering, and paging done in the database. Falls back to demo data only
 * when Supabase isn't configured.
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

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  summary: string;
  description: string;
  price_minor: number;
  stock_quantity: number;
  materials: string[];
  finish: string | null;
  dimensions: string | null;
  featured: boolean;
  is_demo: boolean;
  product_images: {
    id: string;
    storage_path: string | null;
    alt: string;
    width: number | null;
    height: number | null;
    tone: WoodTone;
    position: number;
  }[];
}

const PRODUCT_COLUMNS =
  'id, slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions, featured, is_demo, product_images (id, storage_path, alt, width, height, tone, position)';

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    summary: row.summary,
    description: splitParagraphs(row.description),
    priceMinor: Number(row.price_minor),
    stockQuantity: row.stock_quantity,
    materials: row.materials,
    finish: row.finish ?? '',
    dimensions: row.dimensions,
    featured: row.featured,
    isDemo: row.is_demo,
    images: toMediaImages(row.product_images ?? []),
  };
}

function listDemoProducts({ search, category, inStockOnly, featuredOnly, page = 1, pageSize = 12 }: ListProductsParams) {
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

/** Escapes characters that have meaning in PostgREST `or` filters and LIKE patterns. */
function searchTerm(value: string): string {
  return value.replace(/[%_\\,()*"]/g, ' ').trim();
}

export async function listProducts(params: ListProductsParams = {}): Promise<Paged<Product>> {
  if (!supabase) return listDemoProducts(params);

  const { search, category, inStockOnly, featuredOnly, page = 1, pageSize = 12 } = params;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;

  let query = supabase
    .from('products')
    .select(PRODUCT_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .order('sort_order')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (category) query = query.eq('category', category);
  if (inStockOnly) query = query.gt('stock_quantity', 0);
  if (featuredOnly) query = query.eq('featured', true);
  const term = search ? searchTerm(search) : '';
  if (term) query = query.or(`name.ilike.%${term}%,summary.ilike.%${term}%`);

  const { data, error, count } = await query.returns<ProductRow[]>();
  if (isMissingTable(error)) return listDemoProducts(params);
  if (error) throw toError(error, 'Could not load products.');
  const total = count ?? data.length;
  return {
    items: data.map(toProduct),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!supabase) return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle<ProductRow>();
  if (isMissingTable(error)) return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  if (error) throw toError(error, 'Could not load this product.');
  return data ? toProduct(data) : null;
}

export interface OrderRequestInput {
  /** Idempotency key: retries with the same token never create a second order. */
  clientToken: string;
  productId: string;
  quantity: number;
  note?: string;
}

/**
 * Calls the `request_product_order` database function, which reads the price
 * from the database, reserves stock in a transaction, and creates an order
 * awaiting owner confirmation. Requires a signed-in customer.
 */
export async function submitOrderRequest(input: OrderRequestInput): Promise<{ orderId: string; reference: string }> {
  if (!supabase) {
    throw new NotConnectedError(
      'Online order requests are not connected yet. Please use the contact page to ask about this item.',
    );
  }
  const { data, error } = await requireSupabase()
    .rpc('request_product_order', {
      p_client_token: input.clientToken,
      p_product_id: input.productId,
      p_quantity: input.quantity,
      p_note: input.note ?? null,
    })
    .single<{ id: string; reference: string }>();
  if (error) throw toError(error, 'Could not send your request.');
  return { orderId: data.id, reference: data.reference };
}
