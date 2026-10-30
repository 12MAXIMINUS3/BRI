import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form/Field';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate } from '@/features/account/components/format';
import { ORDER_STATUS, PAYMENT_STATUS, type OrderStatus, type PaymentStatus } from '@/features/account/status';
import { getOrder, NEXT_ORDER_STATUSES, updateOrder, type OrderDetail, type OrderUpdate } from '../api/orders';
import { AdminPageHeader, DetailList, Panel } from '../components/AdminUi';
import { NotesPanel } from '../components/NotesPanel';
import { adminKeys } from '../keys';

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm Order',
  in_production: 'Start Production',
  ready: 'Mark Ready',
  completed: 'Mark Completed',
};

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const order = useQuery({ queryKey: adminKeys.order(id), queryFn: () => getOrder(id) });

  if (order.isPending) return <LoadingState />;
  if (order.isError) return <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />;
  if (!order.data) return <ErrorState title="Order not found" />;
  return <OrderView key={order.data.id + order.data.status + order.data.payment_status} order={order.data} />;
}

function OrderView({ order }: { order: OrderDetail }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (changes: OrderUpdate) => updateOrder(order.id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState({
    estimated_completion_date: order.estimated_completion_date ?? '',
    payment_instructions: order.payment_instructions ?? '',
  });
  const money = (minor: number) => formatMoney(Number(minor), order.currency_code);
  const next = NEXT_ORDER_STATUSES[order.status].filter((s) => s !== 'cancelled');
  const canCancel = NEXT_ORDER_STATUSES[order.status].includes('cancelled');

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/orders', label: 'All orders' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.reference}
            <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge>
            <Badge tone={PAYMENT_STATUS[order.payment_status].tone}>{PAYMENT_STATUS[order.payment_status].label}</Badge>
          </span>
        }
        description={`${order.source === 'custom' ? 'Custom order' : 'Ready-made order'} · placed ${formatDate(order.created_at)}`}
      />
      {update.isError && <Alert tone="error" className="mb-6">{errorMessage(update.error)}</Alert>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid content-start gap-6 xl:col-span-2">
          <Panel title="Production">
            {order.status === 'pending_confirmation' && (
              <p className="mb-4 text-sm text-ivory-300">
                The requested stock is already reserved for this customer. Confirm once you've checked the item and agreed
                payment and delivery. Cancelling returns the stock to the shop.
              </p>
            )}
            <ol className="mb-5 flex flex-wrap gap-2 text-xs" aria-label="Production steps">
              {(['pending_confirmation', 'confirmed', 'in_production', 'ready', 'completed'] as OrderStatus[])
                .filter((s) => order.source === 'ready_made' || s !== 'pending_confirmation')
                .map((s) => (
                  <li
                    key={s}
                    className={`rounded-sm border px-3 py-1.5 ${s === order.status ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-700 text-mist-400'}`}
                  >
                    {ORDER_STATUS[s].label}
                  </li>
                ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              {next.map((s) => (
                <Button key={s} loading={update.isPending && update.variables?.status === s} onClick={() => update.mutate({ status: s })}>
                  {NEXT_LABEL[s] ?? ORDER_STATUS[s].label}
                </Button>
              ))}
              {canCancel && (
                <Button variant="ghost" onClick={() => setCancelling(true)}>
                  Cancel Order
                </Button>
              )}
              {next.length === 0 && !canCancel && <p className="text-sm text-mist-400">This order is closed.</p>}
            </div>
            {order.cancellation_reason && (
              <p className="mt-4 text-sm text-ivory-300">Cancellation reason: {order.cancellation_reason}</p>
            )}
          </Panel>

          <Panel title="Payment">
            <p className="mb-4 text-sm text-ivory-300">
              Record payments here once received. Payment status is separate from production and is never changed
              automatically.
            </p>
            <SelectField
              label="Payment status"
              required
              value={order.payment_status}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ payment_status: e.target.value as PaymentStatus })}
              className="max-w-xs"
            >
              {Object.entries(PAYMENT_STATUS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </SelectField>
          </Panel>

          <Panel title="Items">
            <ul className="divide-y divide-ink-700 border-y border-ink-700 text-sm">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3">
                  <span>
                    {item.products ? (
                      <Link to={`/shop/${item.products.slug}`} target="_blank" className="text-gold-300 underline">
                        {item.description}
                      </Link>
                    ) : (
                      item.description
                    )}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    <span className="ml-2 text-xs text-mist-500">@ {money(item.unit_price_minor)}</span>
                  </span>
                  <span className="text-ivory-50">{money(item.line_total_minor)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between">
              <span>Total</span>
              <span className="font-display text-2xl text-gold-300">{money(order.total_minor)}</span>
            </div>
          </Panel>

          <Panel title="Details shown to the customer">
            <div className="grid gap-4">
              <TextField
                label="Estimated completion"
                type="date"
                value={details.estimated_completion_date}
                onChange={(e) => setDetails({ ...details, estimated_completion_date: e.target.value })}
                className="max-w-xs"
              />
              <TextAreaField
                label="Payment instructions"
                rows={4}
                value={details.payment_instructions}
                onChange={(e) => setDetails({ ...details, payment_instructions: e.target.value })}
              />
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={update.isPending && update.variables?.payment_instructions !== undefined}
                  onClick={() =>
                    update.mutate({
                      estimated_completion_date: details.estimated_completion_date || null,
                      payment_instructions: details.payment_instructions.trim() || null,
                    })
                  }
                >
                  Save Details
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Customer">
            <DetailList
              items={[
                ['Name', order.profiles?.full_name],
                ['Email', order.profiles?.email && <a href={`mailto:${order.profiles.email}`} className="text-gold-300 underline">{order.profiles.email}</a>],
                ['Phone', order.profiles?.phone || order.custom_requests?.phone],
                ['Delivery location', order.custom_requests?.delivery_location],
                ['Customer note', order.customer_note],
                [
                  'From request',
                  order.custom_requests && (
                    <Link to={`/admin/requests/${order.custom_requests.id}`} className="text-gold-300 underline">
                      {order.custom_requests.reference}
                    </Link>
                  ),
                ],
              ]}
            />
          </Panel>
          <NotesPanel entityType="order" entityId={order.id} />
        </div>
      </div>

      <Dialog open={cancelling} onClose={() => !update.isPending && setCancelling(false)} title="Cancel this order?">
        <p className="leading-relaxed text-ivory-200">
          The customer will see it as cancelled.
          {order.source === 'ready_made' && ' The reserved stock goes back to the shop.'}
        </p>
        <TextAreaField label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4" />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelling(false)}>
            Keep Order
          </Button>
          <Button
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                { status: 'cancelled', cancellation_reason: reason.trim() || null },
                { onSettled: () => setCancelling(false) },
              )
            }
          >
            Cancel Order
          </Button>
        </div>
      </Dialog>
    </>
  );
}
