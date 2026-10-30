import { categoryLabel } from '@/config/catalog';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { usePageMeta } from '@/lib/usePageMeta';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { VideoHeader } from '@/components/media/VideoHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import type { CustomerOrder, CustomerRequest } from '../api';
import { QuotationCard } from '../components/QuotationCard';
import { formatDate } from '../components/format';
import { useMyOrders, useMyRequests } from '../hooks';
import { ORDER_STATUS, ORDER_STEPS, PAYMENT_STATUS, REQUEST_STATUS } from '../status';

export function AccountPage() {
  usePageMeta({ title: 'My account', description: 'Your requests, quotations, and orders.', noIndex: true });
  const { profile, user, signOut } = useAuth();
  const requests = useMyRequests();
  const orders = useMyOrders();
  const awaiting = (requests.data ?? []).flatMap((r) => r.quotations).filter((q) => q.status === 'sent').length;

  return (
    <>
      <VideoHeader>
        <Container className="flex flex-col gap-6 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="mt-4 text-5xl">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-3 text-ivory-300">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/custom-order" size="sm">
              New Custom Request
            </ButtonLink>
            <Button size="sm" variant="secondary" onClick={() => void signOut()}>
              Sign Out
            </Button>
          </div>
        </Container>
      </VideoHeader>

      <Container className="grid gap-16 py-14">
        {awaiting > 0 && (
          <p role="status" className="rounded-sm border border-gold-500/40 bg-gold-500/10 px-5 py-4 text-gold-200">
            You have {awaiting === 1 ? 'a quotation' : `${awaiting} quotations`} waiting for your response below.
          </p>
        )}

        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="text-4xl">
            Orders
          </h2>
          <div className="mt-6">
            {orders.isPending ? (
              <LoadingState label="Loading orders…" />
            ) : orders.isError ? (
              <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
            ) : orders.data.length === 0 ? (
              <EmptyState
                title="No orders yet"
                message="Orders appear here once you accept a quotation or request a ready-made piece."
              />
            ) : (
              <ul className="grid gap-6">
                {orders.data.map((order) => (
                  <li key={order.id}>
                    <OrderCard order={order} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="requests-heading">
          <h2 id="requests-heading" className="text-4xl">
            Custom requests
          </h2>
          <div className="mt-6">
            {requests.isPending ? (
              <LoadingState label="Loading requests…" />
            ) : requests.isError ? (
              <ErrorState message={errorMessage(requests.error)} onRetry={() => requests.refetch()} />
            ) : requests.data.length === 0 ? (
              <EmptyState
                title="No requests yet"
                message="Tell us about a piece you'd like made and we'll send you a quotation."
                action={<ButtonLink to="/custom-order">Request a Custom Order</ButtonLink>}
              />
            ) : (
              <ul className="grid gap-6">
                {requests.data.map((request) => (
                  <li key={request.id}>
                    <RequestCard request={request} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </Container>
    </>
  );
}

function RequestCard({ request }: { request: CustomerRequest }) {
  const status = REQUEST_STATUS[request.status];
  return (
    <article className="rounded-sm border border-ink-700 bg-ink-850 p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">{request.reference}</p>
          <h3 className="mt-1 text-2xl">
            {categoryLabel(request.category)}
            {request.quantity > 1 ? ` × ${request.quantity}` : ''}
          </h3>
          <p className="mt-1 text-sm text-mist-400">Sent {formatDate(request.created_at)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="mt-4 line-clamp-3 leading-relaxed text-ivory-300">{request.description}</p>

      {request.quotations.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {request.quotations.map((q) => (
            <QuotationCard key={q.id} quotation={q} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-mist-400">
          We're reviewing your requirements. You'll see the quotation here when it's ready.
        </p>
      )}
    </article>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const status = ORDER_STATUS[order.status];
  const payment = PAYMENT_STATUS[order.payment_status];
  const stepIndex = ORDER_STEPS.indexOf(order.status);
  const money = (minor: number) => formatMoney(Number(minor), order.currency_code);

  return (
    <article className="rounded-sm border border-ink-700 bg-ink-850 p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">{order.reference}</p>
          <h3 className="mt-1 text-2xl">
            {order.source === 'custom'
              ? `Custom order${order.custom_requests ? ` · ${order.custom_requests.reference}` : ''}`
              : 'Ready-made order'}
          </h3>
          <p className="mt-1 text-sm text-mist-400">Placed {formatDate(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={payment.tone}>{payment.label}</Badge>
        </div>
      </div>

      {order.status !== 'cancelled' && order.status !== 'pending_confirmation' && (
        <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Order progress">
          {ORDER_STEPS.map((step, i) => {
            const done = stepIndex >= i;
            return (
              <li key={step}>
                <span className={cn('block h-1 rounded-full', done ? 'bg-gold-500' : 'bg-ink-700')} />
                <span className={cn('mt-2 block text-xs', done ? 'text-gold-300' : 'text-mist-500')}>
                  {ORDER_STATUS[step].label}
                  <span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {order.status === 'pending_confirmation' && (
        <p className="mt-5 text-sm text-ivory-300">
          We're checking availability and will confirm your order and payment arrangements soon.
        </p>
      )}

      <ul className="mt-6 divide-y divide-ink-700 border-y border-ink-700 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-2.5">
            <span className="text-ivory-200">
              {item.description}
              {item.quantity > 1 ? ` × ${item.quantity}` : ''}
            </span>
            <span className="text-ivory-50">{money(item.line_total_minor)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between">
        <span className="text-ivory-200">Total</span>
        <span className="font-display text-2xl text-gold-300">{money(order.total_minor)}</span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        {order.estimated_completion_date && (
          <div>
            <dt className="text-mist-400">Estimated completion</dt>
            <dd className="text-ivory-200">{formatDate(order.estimated_completion_date)}</dd>
          </div>
        )}
        {order.payment_instructions && order.status !== 'cancelled' && (
          <div className="sm:col-span-2">
            <dt className="text-mist-400">Payment instructions</dt>
            <dd className="mt-0.5 whitespace-pre-line text-ivory-200">{order.payment_instructions}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
