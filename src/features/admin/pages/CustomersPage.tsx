import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate } from '@/features/account/components/format';
import { listCustomers } from '../api/misc';
import { AdminPageHeader, DataTable, FilterBar, Td } from '../components/AdminUi';
import { SearchFilter, useListParams } from '../components/ListControls';
import { adminKeys } from '../keys';

export function CustomersPage() {
  const { values, page, set } = useListParams(['q'] as const);
  const params = { search: values.q, page };
  const list = useQuery({ queryKey: adminKeys.customers(params), queryFn: () => listCustomers(params), placeholderData: keepPreviousData });

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Everyone who has registered an account. Admin access is granted only from the Supabase SQL editor."
      />
      <FilterBar>
        <SearchFilter value={values.q} onSearch={(q) => set({ q })} placeholder="Name, email, or phone" />
      </FilterBar>
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-ink-600 p-10 text-center text-mist-400">No accounts yet.</p>
      ) : (
        <>
          <DataTable caption="Customers" head={['Name', 'Contact', 'Requests', 'Orders', 'Joined']}>
            {list.data.items.map((c) => (
              <tr key={c.id} className="hover:bg-ink-900">
                <Td>
                  <span className="text-ivory-50">{c.full_name || '—'}</span>
                  {c.role === 'admin' && <Badge tone="success" className="ml-2">Admin</Badge>}
                </Td>
                <Td>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="block text-gold-300 hover:underline">
                      {c.email}
                    </a>
                  )}
                  {c.phone && <span className="text-xs text-mist-400">{c.phone}</span>}
                </Td>
                <Td>
                  {c.custom_requests[0]?.count ? (
                    <Link to={`/admin/requests?q=${encodeURIComponent(c.email ?? '')}`} className="text-gold-300 hover:underline">
                      {c.custom_requests[0].count}
                    </Link>
                  ) : (
                    0
                  )}
                </Td>
                <Td>{c.orders[0]?.count ?? 0}</Td>
                <Td>{formatDate(c.created_at)}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination className="mt-6" page={list.data.page} pageCount={list.data.pageCount} onPageChange={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}
