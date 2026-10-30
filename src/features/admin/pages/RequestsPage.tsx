import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { categoryLabel } from '@/config/catalog';
import { errorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate } from '@/features/account/components/format';
import { REQUEST_STATUS, type RequestStatus } from '@/features/account/status';
import { listRequests } from '../api/requests';
import { AdminPageHeader, DataTable, FilterBar, Td } from '../components/AdminUi';
import { SearchFilter, SelectFilter, useListParams } from '../components/ListControls';
import { adminKeys } from '../keys';

export function RequestsPage() {
  const { values, page, set } = useListParams(['status', 'q'] as const);
  const params = { status: (values.status || undefined) as RequestStatus | undefined, search: values.q, page };
  const requests = useQuery({ queryKey: adminKeys.requests(params), queryFn: () => listRequests(params), placeholderData: keepPreviousData });

  return (
    <>
      <AdminPageHeader title="Custom requests" description="Review what customers have asked for and send quotations." />
      <FilterBar>
        <SelectFilter
          id="request-status"
          label="Status"
          value={values.status}
          onChange={(v) => set({ status: v })}
          options={Object.entries(REQUEST_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <SearchFilter value={values.q} onSearch={(q) => set({ q })} placeholder="Reference, name, or email" />
      </FilterBar>

      {requests.isPending ? (
        <LoadingState />
      ) : requests.isError ? (
        <ErrorState message={errorMessage(requests.error)} onRetry={() => requests.refetch()} />
      ) : requests.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-ink-600 p-10 text-center text-mist-400">No requests match.</p>
      ) : (
        <>
          <DataTable caption="Custom requests" head={['Reference', 'Customer', 'Category', 'Received', 'Status']}>
            {requests.data.items.map((r) => (
              <tr key={r.id} className="hover:bg-ink-900">
                <Td>
                  <Link to={`/admin/requests/${r.id}`} className="font-semibold text-gold-300 hover:underline">
                    {r.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block text-ivory-50">{r.full_name}</span>
                  <span className="text-xs text-mist-400">{r.email}</span>
                </Td>
                <Td>
                  {categoryLabel(r.category)}
                  {r.quantity > 1 ? ` × ${r.quantity}` : ''}
                </Td>
                <Td>{formatDate(r.created_at)}</Td>
                <Td>
                  <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination className="mt-6" page={requests.data.page} pageCount={requests.data.pageCount} onPageChange={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}
