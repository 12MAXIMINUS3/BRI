/**
 * Shared catalogue vocabulary used by portfolio projects, products, and
 * custom-order requests. Phase 2 mirrors the category slugs in the database
 * (`product_category` enum) so the frontend and backend validate the same values.
 */

export const CATEGORIES = [
  { slug: 'tables', label: 'Tables' },
  { slug: 'seating', label: 'Seating' },
  { slug: 'storage', label: 'Storage & shelving' },
  { slug: 'cabinetry', label: 'Cabinetry & built-ins' },
  { slug: 'beds', label: 'Beds' },
  { slug: 'outdoor', label: 'Outdoor' },
  { slug: 'decor', label: 'Décor & small goods' },
  { slug: 'other', label: 'Other' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const CATEGORY_SLUGS: readonly CategorySlug[] = CATEGORIES.map((c) => c.slug);

export function isCategorySlug(value: string | null | undefined): value is CategorySlug {
  return !!value && (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? 'Other';
}

/**
 * Top-level departments. Each category slug above belongs to one department.
 * Interior design types are added here (and to the database enum) once the
 * owner confirms the list.
 */
export const DEPARTMENTS = [
  {
    slug: 'interior-design',
    label: 'Interior Design',
    description: 'Complete interiors planned and finished around how you use each space.',
    categories: [] as CategorySlug[],
  },
  {
    slug: 'furniture',
    label: 'Furniture',
    description: 'Handmade pieces, made to order or ready to take home.',
    categories: ['tables', 'seating', 'storage', 'cabinetry', 'beds', 'outdoor', 'decor', 'other'] as CategorySlug[],
  },
] as const;

export type DepartmentSlug = (typeof DEPARTMENTS)[number]['slug'];

export function departmentOf(category: string): (typeof DEPARTMENTS)[number] | undefined {
  return DEPARTMENTS.find((d) => (d.categories as readonly string[]).includes(category));
}

/** Value used when a customer wants the owner to recommend a material or finish. */
export const NEED_ADVICE = 'need-advice';

// Editable lists. Remove or add entries to match what the workshop offers.
export const MATERIALS = [
  'Oak',
  'Walnut',
  'Ash',
  'Maple',
  'Cherry',
  'Teak',
  'Pine',
  'Mahogany',
  'Plywood / engineered board',
  'Other (describe in project details)',
] as const;

export const FINISHES = [
  'Natural oil',
  'Hardwax oil',
  'Clear lacquer, matte',
  'Clear lacquer, satin',
  'Stain with clear topcoat',
  'Painted',
  'Other (describe in project details)',
] as const;

export const MEASUREMENT_UNITS = [
  { value: 'mm', label: 'Millimetres (mm)' },
  { value: 'cm', label: 'Centimetres (cm)' },
  { value: 'm', label: 'Metres (m)' },
  { value: 'in', label: 'Inches (in)' },
  { value: 'ft', label: 'Feet (ft)' },
] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number]['value'];
