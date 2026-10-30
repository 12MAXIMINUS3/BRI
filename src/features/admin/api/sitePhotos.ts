import { business } from '@/config/business';
import { BRAND_LOGO_KEY, BRAND_VIDEO_KEY, SITE_PHOTOS, setSitePhotoOverride, type SitePhotoKey } from '@/config/images';
import { catalogImageUrl, siteMediaUrl } from '@/lib/supabase';
import { CATALOG_IMAGE_RULES } from './catalog';
import { check, db } from './shared';

/** A replacement saved in the dashboard. Slots without a row show the default photo. */
export interface SitePhotoRow {
  key: string;
  storage_path: string;
  alt: string;
  updated_at: string;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

/** Uploaded files live in storage; bundled defaults start with "/" and are never deleted. */
const isUploaded = (path: string | null | undefined): path is string => !!path && !path.startsWith('/');

export async function listSitePhotos(): Promise<Map<string, SitePhotoRow>> {
  const rows = check(
    await db().from('site_photos').select('key, storage_path, alt, updated_at').returns<SitePhotoRow[]>(),
    'Could not load site photos.',
  );
  return new Map((rows ?? []).map((row) => [row.key, row]));
}

export function validatePhotoFile(file: File): string | null {
  if (!(CATALOG_IMAGE_RULES.mimeTypes as readonly string[]).includes(file.type)) {
    return `"${file.name}" isn't a supported photo. Use JPG, PNG, WebP, or AVIF.`;
  }
  if (file.size > CATALOG_IMAGE_RULES.maxBytes) return `"${file.name}" is larger than 8 MB. Please use a smaller photo.`;
  return null;
}

const MAX_EDGE = 2000;

/**
 * Phone photos are often 4000+ pixels and several MB. Shrink them to at most
 * 2000px on the longest side so pages stay fast on mobile data. Falls back to
 * the original file if the browser can't process it.
 */
async function shrinkForWeb(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Uploads a new photo for a slot and keeps (or sets) its description. */
export async function replaceSitePhoto(key: SitePhotoKey, original: File, alt: string, previous: SitePhotoRow | undefined) {
  const file = await shrinkForWeb(original);
  const problem = validatePhotoFile(file);
  if (problem) throw new Error(problem);

  const path = `site/${key.replace(/\//g, '-')}-${crypto.randomUUID()}.${EXT[file.type] ?? 'jpg'}`;
  const upload = await db().storage.from('catalog-images').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const description = alt.trim() || SITE_PHOTOS[key].alt;
  const saved = await db().from('site_photos').upsert({ key, storage_path: path, alt: description });
  if (saved.error) {
    await db().storage.from('catalog-images').remove([path]);
    throw new Error(saved.error.message);
  }
  if (isUploaded(previous?.storage_path)) await db().storage.from('catalog-images').remove([previous.storage_path]);
  setSitePhotoOverride(key, { url: catalogImageUrl(path)!, alt: description });
}

/** Changes only the description, keeping whichever photo is currently shown. */
export async function saveSitePhotoDescription(key: SitePhotoKey, alt: string, current: SitePhotoRow | undefined) {
  const description = alt.trim();
  if (!description) throw new Error('Please write a short description of the photo.');
  const storagePath = current?.storage_path ?? SITE_PHOTOS[key].src;
  check(await db().from('site_photos').upsert({ key, storage_path: storagePath, alt: description }), 'Could not save the description.');
  setSitePhotoOverride(key, { url: catalogImageUrl(storagePath)!, alt: description });
}

/** Goes back to the original photo and description (or the built-in logo / video). */
export async function resetSitePhoto(key: string, current: SitePhotoRow | undefined) {
  check(await db().from('site_photos').delete().eq('key', key), 'Could not reset.');
  if (isUploaded(current?.storage_path)) await db().storage.from(bucketFor(key)).remove([current.storage_path]);
  setSitePhotoOverride(key, null);
}

// --- Logo and background video ------------------------------------------------------

const bucketFor = (key: string) => (key.startsWith('brand/') ? 'site-media' : 'catalog-images');

export const BRAND_RULES = {
  [BRAND_LOGO_KEY]: {
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
    help: 'PNG (best, keeps a transparent background), JPG, or WebP, up to 5 MB.',
  },
  [BRAND_VIDEO_KEY]: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxBytes: 50 * 1024 * 1024,
    help: 'MP4 (best), WebM, or iPhone MOV, up to 50 MB. Short clips of 10–30 seconds work best; it plays silently on repeat.',
  },
} as const;

export type BrandKey = keyof typeof BRAND_RULES;

const MEDIA_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export function validateBrandFile(key: BrandKey, file: File): string | null {
  const rules = BRAND_RULES[key];
  if (!(rules.mimeTypes as readonly string[]).includes(file.type)) {
    return `"${file.name}" can't be used here. ${rules.help}`;
  }
  if (file.size > rules.maxBytes) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${rules.maxBytes / 1024 / 1024} MB, so please use a shorter or smaller file.`;
  }
  return null;
}

/** Uploads a new logo or background video and switches the website to it. */
export async function replaceBrandMedia(key: BrandKey, file: File, previous: SitePhotoRow | undefined) {
  const problem = validateBrandFile(key, file);
  if (problem) throw new Error(problem);

  const path = `brand/${key.split('/')[1]}-${crypto.randomUUID()}.${MEDIA_EXT[file.type] ?? 'bin'}`;
  const upload = await db().storage.from('site-media').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const alt = key === BRAND_LOGO_KEY ? `${business.name} logo` : 'Background video';
  const saved = await db().from('site_photos').upsert({ key, storage_path: path, alt });
  if (saved.error) {
    await db().storage.from('site-media').remove([path]);
    throw new Error(saved.error.message);
  }
  if (isUploaded(previous?.storage_path)) await db().storage.from('site-media').remove([previous.storage_path]);
  setSitePhotoOverride(key, { url: siteMediaUrl(key, path)!, alt });
}
