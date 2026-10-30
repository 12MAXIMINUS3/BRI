import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { categoryLabel, DEPARTMENTS, isCategorySlug } from '@/config/catalog';
import { usePageMeta } from '@/lib/usePageMeta';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { FilterChips } from '@/components/ui/FilterChips';
import { inputClasses } from '@/components/ui/form/Field';
import { SearchIcon } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/Pagination';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { VideoHeader } from '@/components/media/VideoHeader';
import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../hooks';

const PAGE_SIZE = 6;
const furnitureCategories = DEPARTMENTS.find((d) => d.slug === 'furniture')?.categories ?? [];

export function ShopPage() {
  usePageMeta({
    title: 'Available Products',
    description: 'Ready-made wooden furniture and homeware, with prices and current stock.',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const rawCategory = searchParams.get('category');
  const category = isCategorySlug(rawCategory) ? rawCategory : undefined;
  const inStockOnly = searchParams.get('stock') === 'in';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => setSearchDraft(search), [search]);

  const { data, isPending, isError, isPlaceholderData, refetch } = useProducts({
    search,
    category,
    inStockOnly,
    page,
    pageSize: PAGE_SIZE,
  });

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    update({ q: searchDraft.trim() || null });
  };

  const hasFilters = !!(search || category || inStockOnly);

  return (
    <>
      <VideoHeader>
        <Container className="py-16 sm:py-20">
          <SectionHeading
            as="h1"
            eyebrow="Shop"
            title="Available Products"
            description="Ready-made pieces with set prices. Request an item and we'll confirm availability and payment arrangements with you before your order is final."
          />
        </Container>
      </VideoHeader>

      <Container className="py-12 sm:py-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form role="search" onSubmit={onSearch} className="flex w-full max-w-md gap-2">
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist-500" />
              <input
                id="shop-search"
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search by name or material"
                className={`${inputClasses} pl-10`}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex h-12 items-center gap-2.5 text-sm font-medium text-ivory-200">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => update({ stock: e.target.checked ? 'in' : null })}
                className="size-5 accent-gold-500"
              />
              In stock only
            </label>
          </div>
        </div>

        <div className="mt-8 border-y border-ink-700 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Furniture</p>
            <Link to="/categories#interior-design" className="text-sm text-ivory-300 hover:text-gold-300">
              Looking for interior design? →
            </Link>
          </div>
          <FilterChips
            className="mt-4"
            label="Filter by furniture category"
            value={category ?? ''}
            onChange={(value) => update({ category: value || null })}
            options={[
              { value: '', label: 'All furniture' },
              ...furnitureCategories.map((slug) => ({ value: slug, label: categoryLabel(slug) })),
            ]}
          />
        </div>

        <div className="mt-10" aria-live="polite" aria-busy={isPlaceholderData || undefined}>
          {isPending ? (
            <LoadingState label="Loading products…" />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState
              title={hasFilters ? 'No products match your search' : 'No products available right now'}
              message={
                hasFilters
                  ? 'Try a different search or clear the filters.'
                  : 'New pieces are added from time to time. Most of our work is made to order.'
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
                    Clear filters
                  </Button>
                ) : (
                  <ButtonLink to="/custom-order">Request a Custom Order</ButtonLink>
                )
              }
            />
          ) : (
            <>
              <p className="mb-6 text-sm text-mist-400">
                {data.total} {data.total === 1 ? 'product' : 'products'}
              </p>
              <div className={`grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {data.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                className="mt-14"
                page={data.page}
                pageCount={data.pageCount}
                onPageChange={(p) => update({ page: p > 1 ? String(p) : null }, false)}
              />
            </>
          )}
        </div>
      </Container>
    </>
  );
}
