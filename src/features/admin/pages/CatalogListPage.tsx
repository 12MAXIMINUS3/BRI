import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { categoryLabel } from '@/config/catalog';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { AvailabilityBadge } from '@/features/products/components/AvailabilityBadge';
import { listCatalog, type AdminProduct, type AdminProject, type CatalogKind, type PublishStatus } from '../api/catalog';
import { AdminPageHeader, DataTable, FilterBar, Td } from '../components/AdminUi';
import { SearchFilter, SelectFilter, useListParams } from '../components/ListControls';
import { adminKeys } from '../keys';

export const PUBLISH_STATUS: Record<PublishStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
  archived: { label: 'Archived', tone: 'danger' },
};

const COPY = {
  product: {
    title: 'Products',
    description: 'Ready-made items: prices, stock, and what appears in the shop.',
    add: 'Add Product',
    base: '/admin/products',
  },
  project: {
    title: 'Portfolio',
    description: 'Past work shown on Our Work. These are examples, not items for sale.',
    add: 'Add Project',
    base: '/admin/portfolio',
  },
} as const;

export function CatalogListPage({ kind }: { kind: CatalogKind }) {
  const copy = COPY[kind];
  const { values, page, set } = useListParams(['status', 'q'] as const);
  const params = { status: (values.status || undefined) as PublishStatus | undefined, search: values.q, page };
  const list = useQuery({
    queryKey: adminKeys.catalog(kind, params),
    queryFn: () => listCatalog(kind, params),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <AdminPageHeader
        title={copy.title}
        description={copy.description}
        actions={<ButtonLink to={`${copy.base}/new`}>{copy.add}</ButtonLink>}
      />
      <FilterBar>
        <SelectFilter
          id={`${kind}-status`}
          label="Visibility"
          value={values.status}
          onChange={(v) => set({ status: v })}
          options={Object.entries(PUBLISH_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <SearchFilter value={values.q} onSearch={(q) => set({ q })} placeholder="Name or slug" />
      </FilterBar>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-ink-600 p-10 text-center text-mist-400">Nothing here yet.</p>
      ) : (
        <>
          <DataTable
            caption={copy.title}
            head={kind === 'product' ? ['Name', 'Category', 'Price', 'Stock', 'Visibility'] : ['Title', 'Category', 'Featured', 'Visibility']}
          >
            {list.data.items.map((item) => {
              const name = kind === 'product' ? (item as AdminProduct).name : (item as AdminProject).title;
              return (
                <tr key={item.id} className="hover:bg-ink-900">
                  <Td>
                    <Link to={`${copy.base}/${item.id}`} className="font-semibold text-gold-300 hover:underline">
                      {name}
                    </Link>
                    {item.is_demo && <span className="ml-2 text-xs text-mist-500">(demo)</span>}
                    <span className="block text-xs text-mist-500">/{item.slug}</span>
                  </Td>
                  <Td>{categoryLabel(item.category)}</Td>
                  {kind === 'product' ? (
                    <>
                      <Td className="text-ivory-50">{formatMoney(Number((item as AdminProduct).price_minor))}</Td>
                      <Td>
                        <span className="mr-2 text-ivory-50">{(item as AdminProduct).stock_quantity}</span>
                        <AvailabilityBadge stockQuantity={(item as AdminProduct).stock_quantity} />
                      </Td>
                    </>
                  ) : (
                    <Td>{item.featured ? 'Yes' : '—'}</Td>
                  )}
                  <Td>
                    <Badge tone={PUBLISH_STATUS[item.status].tone}>{PUBLISH_STATUS[item.status].label}</Badge>
                  </Td>
                </tr>
              );
            })}
          </DataTable>
          <Pagination className="mt-6" page={list.data.page} pageCount={list.data.pageCount} onPageChange={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}
