import type { BadgeTone } from '@/components/ui/Badge';

export const LOW_STOCK_THRESHOLD = 2;

export type Availability =
  | { status: 'in_stock'; label: string; tone: BadgeTone; maxQuantity: number }
  | { status: 'low_stock'; label: string; tone: BadgeTone; maxQuantity: number }
  | { status: 'out_of_stock'; label: string; tone: BadgeTone; maxQuantity: 0 };

export function getAvailability(stockQuantity: number): Availability {
  const stock = Math.max(0, Math.floor(stockQuantity));
  if (stock === 0) return { status: 'out_of_stock', label: 'Out of stock', tone: 'danger', maxQuantity: 0 };
  if (stock <= LOW_STOCK_THRESHOLD) {
    return { status: 'low_stock', label: `Only ${stock} left`, tone: 'warning', maxQuantity: stock };
  }
  return { status: 'in_stock', label: 'In stock', tone: 'success', maxQuantity: stock };
}

/** Clamps a requested quantity into the range a customer may request. */
export function clampQuantity(requested: number, stockQuantity: number): number {
  const max = getAvailability(stockQuantity).maxQuantity;
  if (max === 0) return 0;
  if (!Number.isFinite(requested)) return 1;
  return Math.min(max, Math.max(1, Math.floor(requested)));
}
