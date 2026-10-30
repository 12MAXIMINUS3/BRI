import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';
import { NEXT_ORDER_STATUSES } from './api/orders';
import { slugify } from './pages/CatalogEditPage';

describe('admin dashboard', () => {
  it('is unavailable without a database connection (never falls back to demo data)', async () => {
    renderRoute('/admin');
    expect(await screen.findByRole('heading', { name: 'Dashboard unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });

  it('builds URL slugs from names', () => {
    expect(slugify('Walnut Dining Table')).toBe('walnut-dining-table');
    expect(slugify('  Café — Oak & Ash!  ')).toBe('cafe-oak-ash');
  });

  it('mirrors the database order transitions', () => {
    expect(NEXT_ORDER_STATUSES.pending_confirmation).toEqual(['confirmed', 'cancelled']);
    expect(NEXT_ORDER_STATUSES.completed).toEqual([]);
    expect(NEXT_ORDER_STATUSES.cancelled).toEqual([]);
    expect(NEXT_ORDER_STATUSES.confirmed).not.toContain('completed');
  });
});
