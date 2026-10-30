import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate } from '@/features/account/components/format';
import { ORDER_STATUS, PAYMENT_STATUS, type OrderStatus, type PaymentStatus } from '@/features/account/status';
import { listOrders } from '../api/orders';
import { AdminPageHeader, DataTable, FilterBar, Td } from '../components/AdminUi';
import { SelectFilter, useListParams } from '../components/ListControls';
import { adminKeys } from '../keys';

export function OrdersPage() {
  const { values, page, set } = useListParams(['status', 'payment', 'source'] as const);
  const params = {
    status: (values.status || undefined) as OrderStatus | undefined,
    payment: (values.payment || undefined) as PaymentStatus | undefined,
    source: (values.source || undefined) as 'custom' | 'ready_made' | undefined,
    page,
  };
  const orders = useQuery({ queryKey: adminKeys.orders(params), queryFn: () => listOrders(params), placeholderData: keepPreviousData });

  return (
    <>
      <AdminPageHeader title="Orders" description="Confirm ready-made requests, track production, and record payments." />
      <FilterBar>
        <SelectFilter
          id="order-status"
          label="Production"
          value={values.status}
          onChange={(v) => set({ status: v })}
          options={Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <SelectFilter
          id="order-payment"
          label="Payment"
          value={values.payment}
          onChange={(v) => set({ payment: v })}
          options={Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <SelectFilter
          id="order-source"
          label="Type"
          value={values.source}
          onChange={(v) => set({ source: v })}
          options={[
            { value: 'custom', label: 'Custom' },
            { value: 'ready_made', label: 'Ready-made' },
          ]}
        />
      </FilterBar>

      {orders.isPending ? (
        <LoadingState />
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-ink-600 p-10 text-center text-mist-400">No orders match.</p>
      ) : (
        <>
          <DataTable caption="Orders" head={['Order', 'Customer', 'Type', 'Total', 'Production', 'Payment', 'Placed']}>
            {orders.data.items.map((o) => (
              <tr key={o.id} className="hover:bg-ink-900">
                <Td>
                  <Link to={`/admin/orders/${o.id}`} className="font-semibold text-gold-300 hover:underline">
                    {o.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block text-ivory-50">{o.profiles?.full_name || '—'}</span>
                  <span className="text-xs text-mist-400">{o.profiles?.email}</span>
                </Td>
                <Td>{o.source === 'custom' ? 'Custom' : 'Ready-made'}</Td>
                <Td className="text-ivory-50">{formatMoney(Number(o.total_minor), o.currency_code)}</Td>
                <Td>
                  <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                </Td>
                <Td>
                  <Badge tone={PAYMENT_STATUS[o.payment_status].tone}>{PAYMENT_STATUS[o.payment_status].label}</Badge>
                </Td>
                <Td>{formatDate(o.created_at)}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination className="mt-6" page={orders.data.page} pageCount={orders.data.pageCount} onPageChange={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}
