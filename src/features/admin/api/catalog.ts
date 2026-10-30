import type { CategorySlug } from '@/config/catalog';
import { catalogImageUrl } from '@/lib/supabase';
import type { WoodTone } from '@/types/media';
import { check, db, pageRange, searchTerm, toPage, type Page } from './shared';

export type PublishStatus = 'draft' | 'published' | 'archived';
export type CatalogKind = 'product' | 'project';

const TABLE = { product: 'products', project: 'portfolio_projects' } as const;
const IMAGE_TABLE = { product: 'product_images', project: 'portfolio_images' } as const;
const PARENT_KEY = { product: 'product_id', project: 'project_id' } as const;

export interface CatalogImage {
  id: string;
  storage_path: string | null;
  alt: string;
  tone: WoodTone;
  position: number;
  url: string | null;
}

interface BaseItem {
  id: string;
  slug: string;
  category: CategorySlug;
  summary: string;
  description: string;
  materials: string[];
  dimensions: string | null;
  featured: boolean;
  sort_order: number;
  status: PublishStatus;
  is_demo: boolean;
  updated_at: string;
}

export interface AdminProduct extends BaseItem {
  name: string;
  price_minor: number;
  stock_quantity: number;
  finish: string | null;
}

export interface AdminProject extends BaseItem {
  title: string;
  finishes: string[];
}

export type ProductInput = Omit<AdminProduct, 'id' | 'updated_at'>;
export type ProjectInput = Omit<AdminProject, 'id' | 'updated_at'>;

export async function listCatalog<K extends CatalogKind>(
  kind: K,
  params: { status?: PublishStatus; search?: string; page?: number },
): Promise<Page<K extends 'product' ? AdminProduct : AdminProject>> {
  const page = params.page ?? 1;
  const [from, to] = pageRange(page);
  const nameColumn = kind === 'product' ? 'name' : 'title';
  let query = db()
    .from(TABLE[kind])
    .select('*', { count: 'exact' })
    .order('sort_order')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (params.status) query = query.eq('status', params.status);
  const term = searchTerm(params.search);
  if (term) query = query.or(`${nameColumn}.ilike.%${term}%,slug.ilike.%${term}%`);
  const { data, error, count } = await query;
  check({ data, error }, 'Could not load the catalogue.');
  return toPage(data as never[], count, page);
}

export async function getCatalogItem<K extends CatalogKind>(
  kind: K,
  id: string,
): Promise<(K extends 'product' ? AdminProduct : AdminProject) | null> {
  const result = await db().from(TABLE[kind]).select('*').eq('id', id).maybeSingle();
  return check(result, 'Could not load this item.') as never;
}

export async function saveCatalogItem(
  kind: CatalogKind,
  id: string | null,
  values: ProductInput | ProjectInput,
): Promise<string> {
  const payload: Record<string, unknown> = { ...values };
  if (kind === 'project' && values.status === 'published') payload.published_at = new Date().toISOString();
  const query = id
    ? db().from(TABLE[kind]).update(payload).eq('id', id).select('id').single<{ id: string }>()
    : db().from(TABLE[kind]).insert(payload).select('id').single<{ id: string }>();
  const result = await query;
  if (result.error?.code === '23505') throw new Error('That URL slug is already used. Choose another.');
  return check(result, 'Could not save.')!.id;
}

export async function deleteCatalogItem(kind: CatalogKind, id: string) {
  // Image rows cascade with the item; collect their files first so storage doesn't keep orphans.
  const paths = (await listImages(kind, id)).map((img) => img.storage_path).filter((p): p is string => !!p && !p.startsWith('/'));
  const result = await db().from(TABLE[kind]).delete().eq('id', id);
  if (result.error?.code === '23503') {
    throw new Error('This item is referenced by existing orders or requests. Archive it instead.');
  }
  check(result, 'Could not delete.');
  if (paths.length) await db().storage.from('catalog-images').remove(paths);
}

// --- Images ---------------------------------------------------------------------

export async function listImages(kind: CatalogKind, parentId: string): Promise<CatalogImage[]> {
  const result = await db()
    .from(IMAGE_TABLE[kind])
    .select('id, storage_path, alt, tone, position')
    .eq(PARENT_KEY[kind], parentId)
    .order('position');
  const rows = check(result, 'Could not load images.') as Omit<CatalogImage, 'url'>[];
  return rows.map((row) => ({ ...row, url: catalogImageUrl(row.storage_path) }));
}

export const CATALOG_IMAGE_RULES = {
  maxBytes: 8 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
} as const;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

export async function uploadImage(kind: CatalogKind, parentId: string, file: File, alt: string, position: number) {
  if (!(CATALOG_IMAGE_RULES.mimeTypes as readonly string[]).includes(file.type)) {
    throw new Error(`"${file.name}" isn't a supported image. Use JPEG, PNG, WebP, or AVIF.`);
  }
  if (file.size > CATALOG_IMAGE_RULES.maxBytes) throw new Error(`"${file.name}" is larger than 8 MB.`);

  const path = `${kind}s/${parentId}/${crypto.randomUUID()}.${EXT[file.type] ?? 'jpg'}`;
  const upload = await db().storage.from('catalog-images').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const dims = await imageSize(file).catch(() => null);
  const result = await db()
    .from(IMAGE_TABLE[kind])
    .insert({
      [PARENT_KEY[kind]]: parentId,
      storage_path: path,
      alt: alt.trim() || file.name.replace(/\.[^.]+$/, ''),
      position,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    });
  if (result.error) {
    await db().storage.from('catalog-images').remove([path]);
    throw new Error(result.error.message);
  }
}

export async function updateImage(kind: CatalogKind, id: string, changes: { alt?: string; position?: number }) {
  check(await db().from(IMAGE_TABLE[kind]).update(changes).eq('id', id), 'Could not update the image.');
}

export async function deleteImage(kind: CatalogKind, image: CatalogImage) {
  check(await db().from(IMAGE_TABLE[kind]).delete().eq('id', image.id), 'Could not remove the image.');
  // Bundled sample photos (paths starting with /) aren't in storage.
  if (image.storage_path && !image.storage_path.startsWith('/')) {
    await db().storage.from('catalog-images').remove([image.storage_path]);
  }
}

function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unreadable image'));
    };
    img.src = url;
  });
}
