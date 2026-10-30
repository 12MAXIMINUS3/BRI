import type { MediaImage, WoodTone } from '@/types/media';

/**
 * EVERY PHOTO THE WEBSITE SHOWS ON ITS OWN, IN ONE PLACE.
 *
 * The easiest way to change these is the admin dashboard: Admin → Site Photos.
 * Photos uploaded there replace the defaults below without touching code.
 *
 * The defaults are free sample photos (see public/images/stock/CREDITS.md),
 * not BuiltRight's own work. To change a default in code instead:
 *
 *   1. Copy your photo into the folder  public/images/
 *      (for example  public/images/living-room.jpg)
 *   2. Find the photo below and change its `src` to  '/images/living-room.jpg'
 *   3. Update `alt`: a short description of what the photo shows
 *      (read aloud to blind visitors and used by search engines).
 *
 * Tip: landscape photos about 1400 pixels wide work best (JPG or WebP).
 *
 * Products and projects added in the admin dashboard use photos uploaded there,
 * not this file. The `work/…` and `shop/…` photos below are only used for the
 * demo projects and products shown before the database is set up.
 */
export const SITE_PHOTOS = {
  // Home page
  'home/hero': { src: '/images/stock/loft-living-room-1400.webp', alt: 'Loft living room with a leather sofa and wooden furniture' },
  'home/hero-detail': { src: '/images/stock/end-grain-1400.webp', alt: 'End-grain wood blocks' },
  'home/craftsmanship': { src: '/images/stock/woodworker-hands-1400.webp', alt: 'A woodworker sanding a board in the workshop' },

  // About page
  'about/workshop': { src: '/images/stock/workshop-1400.webp', alt: 'A woodworking workshop with benches and hand tools' },
  'about/owner': { src: '/images/stock/tool-wall-1400.webp', alt: 'Hand tools hanging on a workshop wall' },

  // Categories page
  'categories/interior-design': { src: '/images/stock/modern-living-room-1400.webp', alt: 'Living room with an armchair and sofa' },
  'categories/shop-design': { src: '/images/stock/library-shelves-1400.webp', alt: 'Shop interior with floor-to-ceiling wooden display shelves' },
  'categories/pop-wood-design': { src: '/images/stock/wood-panelled-room-1400.webp', alt: 'Room finished with wooden wall panelling' },
  'categories/tables': { src: '/images/stock/dining-table-view-1400.webp', alt: 'Wooden dining table by a window' },
  'categories/seating': { src: '/images/stock/armchair-1400.webp', alt: 'Wooden armchair with a cushion' },
  'categories/storage': { src: '/images/stock/bookshelf-1400.webp', alt: 'Wall of wooden bookshelves' },
  'categories/cabinetry': { src: '/images/stock/kitchen-1400.webp', alt: 'Kitchen with fitted cabinets and an island' },
  'categories/beds': { src: '/images/stock/bedroom-1400.webp', alt: 'Bright bedroom' },
  'categories/outdoor': { src: '/images/stock/outdoor-table-1400.webp', alt: 'Wooden outdoor table with stools' },
  'categories/decor': { src: '/images/stock/cutting-board-herbs-1400.webp', alt: 'Wooden board with herbs and spices' },
  'categories/other': { src: '/images/stock/wood-planks-1400.webp', alt: 'Wooden planks' },

  // Demo portfolio projects (Our Work)
  'work/walnut-dining-table-1': { src: '/images/stock/dining-table-view-1400.webp', alt: 'Wooden dining table by a window with a city view' },
  'work/walnut-dining-table-2': { src: '/images/stock/rustic-tabletop-1400.webp', alt: 'Close-up of a solid wood tabletop' },
  'work/walnut-dining-table-3': { src: '/images/stock/dining-room-1400.webp', alt: 'Dining room with a wooden table and chairs' },
  'work/oak-alcove-shelving-1': { src: '/images/stock/shelving-living-room-1400.webp', alt: 'Living room with floor-to-ceiling shelving' },
  'work/oak-alcove-shelving-2': { src: '/images/stock/library-shelves-1400.webp', alt: 'Wooden bookshelves in a reading room' },
  'work/ash-lounge-chair-1': { src: '/images/stock/armchair-1400.webp', alt: 'Wooden armchair with a cushion by a window' },
  'work/ash-lounge-chair-2': { src: '/images/stock/minimal-living-room-1400.webp', alt: 'Cosy living room with a sofa' },
  'work/teak-garden-bench-1': { src: '/images/stock/outdoor-table-1400.webp', alt: 'Wooden outdoor table with stools' },
  'work/cherry-bed-frame-1': { src: '/images/stock/bedroom-1400.webp', alt: 'Bright bedroom with a desk' },
  'work/cherry-bed-frame-2': { src: '/images/stock/breakfast-tray-1400.webp', alt: 'Breakfast served on a wooden tray' },
  'work/maple-kitchen-island-1': { src: '/images/stock/kitchen-1400.webp', alt: 'Kitchen with an island and pendant lights' },
  'work/maple-kitchen-island-2': { src: '/images/stock/kitchen-drawer-1400.webp', alt: 'Wooden drawer organiser holding cutlery' },
  'work/oak-media-console-1': { src: '/images/stock/wood-panelled-room-1400.webp', alt: 'Wood-panelled wall with a low cabinet' },
  'work/walnut-serving-boards-1': { src: '/images/stock/cutting-board-herbs-1400.webp', alt: 'Wooden board with herbs and spices' },

  // Demo shop products
  'shop/oak-side-table-1': { src: '/images/stock/side-table-1400.webp', alt: 'Round side table beside an armchair' },
  'shop/oak-side-table-2': { src: '/images/stock/rustic-tabletop-1400.webp', alt: 'Close-up of a solid wood tabletop' },
  'shop/walnut-wall-shelf-1': { src: '/images/stock/wall-shelf-plants-1400.webp', alt: 'Wooden shelf with potted plants' },
  'shop/ash-step-stool-1': { src: '/images/stock/benches-1400.webp', alt: 'Wooden table and benches in sunlight' },
  'shop/cherry-serving-tray-1': { src: '/images/stock/tray-table-1400.webp', alt: 'Woven tray on a dining table' },
  'shop/oak-coat-rack-1': { src: '/images/stock/hallway-1400.webp', alt: 'Hallway with a wooden floor and shelving' },
  'shop/teak-planter-box-1': { src: '/images/stock/terracotta-planters-1400.webp', alt: 'Plants in terracotta pots' },
  'shop/maple-cutting-board-1': { src: '/images/stock/end-grain-1400.webp', alt: 'End-grain wood blocks' },
} as const satisfies Record<string, { src: string; alt: string }>;

export type SitePhotoKey = keyof typeof SITE_PHOTOS;

/**
 * The photos the owner can change in Admin → Site Photos, grouped by page,
 * with a plain-language name and where exactly each one appears.
 */
export interface EditablePhoto {
  key: SitePhotoKey;
  name: string;
  where: string;
}

export const EDITABLE_PHOTO_GROUPS: { page: string; path: string; photos: EditablePhoto[] }[] = [
  {
    page: 'Home page',
    path: '/',
    photos: [
      { key: 'home/hero', name: 'Main photo', where: 'The large photo at the top, beside "Furniture crafted around you". The first thing visitors see.' },
      { key: 'home/hero-detail', name: 'Small detail photo', where: 'The second, smaller photo next to the main photo at the top.' },
      { key: 'home/craftsmanship', name: 'Craftsmanship photo', where: 'Beside "Made by hand, one piece at a time", further down the page.' },
    ],
  },
  {
    page: 'About page',
    path: '/about',
    photos: [
      { key: 'about/workshop', name: 'Workshop photo', where: 'The large photo at the top, beside "About BuiltRight Interiors".' },
      { key: 'about/owner', name: 'Owner photo', where: 'Beside "Owner and craftsmanship". A good place for a photo of you at work.' },
    ],
  },
  {
    page: 'Categories page: Interior Design',
    path: '/categories#interior-design',
    photos: [
      { key: 'categories/interior-design', name: 'Interior Design main photo', where: 'The large framed photo beside "Interior Design".' },
      { key: 'categories/shop-design', name: 'Shop Designing', where: 'The "Shop Designing" service card.' },
      { key: 'categories/pop-wood-design', name: 'POP Wood Design', where: 'The "POP Wood Design" service card.' },
    ],
  },
  {
    page: 'Categories page: Furniture',
    path: '/categories#furniture',
    photos: [
      { key: 'categories/tables', name: 'Tables', where: 'The "Tables" card.' },
      { key: 'categories/seating', name: 'Seating', where: 'The "Seating" card.' },
      { key: 'categories/storage', name: 'Storage & shelving', where: 'The "Storage & shelving" card.' },
      { key: 'categories/cabinetry', name: 'Cabinetry & built-ins', where: 'The "Cabinetry & built-ins" card.' },
      { key: 'categories/beds', name: 'Beds', where: 'The "Beds" card.' },
      { key: 'categories/outdoor', name: 'Outdoor', where: 'The "Outdoor" card.' },
      { key: 'categories/decor', name: 'Décor & small goods', where: 'The "Décor & small goods" card.' },
      { key: 'categories/other', name: 'Other', where: 'The "Other" card.' },
    ],
  },
];

/** Logo and header video, also changeable in Admin → Logo & Photos. */
export const BRAND_LOGO_KEY = 'brand/logo';
export const BRAND_VIDEO_KEY = 'brand/header-video';
export const DEFAULT_HEADER_VIDEO = '/media/workshop.mp4';

/** Replacements saved in the dashboard (loaded from the site_photos table at startup). */
const overrides = new Map<string, { url: string; alt: string }>();
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version++;
  for (const listener of listeners) listener();
};

export function applySitePhotoOverrides(rows: { key: string; url: string | null; alt: string }[]) {
  overrides.clear();
  for (const row of rows) if (row.url) overrides.set(row.key, { url: row.url, alt: row.alt });
  changed();
}

export function setSitePhotoOverride(key: string, value: { url: string; alt: string } | null) {
  if (value) overrides.set(key, value);
  else overrides.delete(key);
  changed();
}

/** For useSyncExternalStore: re-render the logo and video as soon as they change. */
export const siteMediaStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getVersion: () => version,
};

/** The uploaded logo, or null to use the built-in BuiltRight logo. */
export function customLogo(): { url: string; alt: string } | null {
  return overrides.get(BRAND_LOGO_KEY) ?? null;
}

export function headerVideoUrl(): string {
  return overrides.get(BRAND_VIDEO_KEY)?.url ?? DEFAULT_HEADER_VIDEO;
}

export function isSitePhotoReplaced(key: string): boolean {
  return overrides.has(key);
}

/** Builds an image for <WoodImage>. The tone is the colour shown if the file can't load. */
export function sitePhoto(key: SitePhotoKey, tone: WoodTone = 'oak'): MediaImage {
  const custom = overrides.get(key);
  const { src, alt } = custom ? { src: custom.url, alt: custom.alt } : SITE_PHOTOS[key];
  return { id: key, url: src, alt, tone };
}
