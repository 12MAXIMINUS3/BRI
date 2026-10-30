import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { business } from '@/config/business';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';
import { Alert } from '@/components/ui/Alert';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { getOverviewCounts, getRecentActivity, type ActivityEvent, type OverviewCounts } from '../api/misc';
import { AdminPageHeader, Panel } from '../components/AdminUi';
import { adminKeys } from '../keys';

const TILES: { key: keyof OverviewCounts; label: string; hint: string; to: string; urgent?: boolean }[] = [
  { key: 'newRequests', label: 'Requests to review', hint: 'Submitted or under review', to: '/admin/requests?status=submitted', urgent: true },
  { key: 'pendingOrders', label: 'Orders to confirm', hint: 'Ready-made requests awaiting you', to: '/admin/orders?status=pending_confirmation', urgent: true },
  { key: 'newInquiries', label: 'New messages', hint: 'From the contact form', to: '/admin/inquiries?status=new', urgent: true },
  { key: 'quotationsAwaiting', label: 'Quotations out', hint: 'Waiting for the customer', to: '/admin/requests?status=quotation_sent' },
  { key: 'activeOrders', label: 'Orders in progress', hint: 'Confirmed, in production, or ready', to: '/admin/orders' },
  { key: 'unpaidOrders', label: 'Awaiting payment', hint: 'Unpaid or deposit only', to: '/admin/orders?payment=unpaid' },
  { key: 'lowStock', label: 'Low or no stock', hint: '2 or fewer left', to: '/admin/products' },
  { key: 'customers', label: 'Customers', hint: 'Registered accounts', to: '/admin/customers' },
];

const KIND_STYLE: Record<ActivityEvent['kind'], string> = {
  signup: 'bg-[#8fa6c2]',
  request: 'bg-gold-400',
  order: 'bg-[#8fbf7a]',
  inquiry: 'bg-[#e0a458]',
  status: 'bg-mist-500',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
  ];
  let value = seconds;
  for (const [size, unit] of units) {
    if (value < size) return new Intl.RelativeTimeFormat(business.locale, { numeric: 'auto' }).format(-Math.round(value), unit);
    value /= size;
  }
  return new Intl.RelativeTimeFormat(business.locale).format(-Math.round(value), 'year');
}

export function OverviewPage() {
  const counts = useQuery({ queryKey: adminKeys.counts(), queryFn: getOverviewCounts, refetchInterval: 60_000 });
  const activity = useQuery({ queryKey: adminKeys.activity(), queryFn: () => getRecentActivity(), refetchInterval: 60_000 });

  return (
    <>
      <AdminPageHeader title="Overview" description="What needs your attention, and what's been happening on the website." />

      {!business.currencyCode && (
        <Alert tone="warning" className="mb-8" title="Set your currency">
          Customers can't request products and quotations can't be created until a currency is set.{' '}
          <Link to="/admin/settings" className="font-semibold underline">
            Go to Settings
          </Link>
        </Alert>
      )}

      {counts.isPending ? (
        <LoadingState />
      ) : counts.isError ? (
        <ErrorState message={errorMessage(counts.error)} onRetry={() => counts.refetch()} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TILES.map((tile) => {
            const value = counts.data[tile.key];
            const hot = tile.urgent && value > 0;
            return (
              <li key={tile.key}>
                <Link
                  to={tile.to}
                  className={cn(
                    'block h-full rounded-sm border p-5 transition-colors hover:border-gold-500/60',
                    hot ? 'border-gold-500/50 bg-gold-500/[0.07]' : 'border-ink-700 bg-ink-850',
                  )}
                >
                  <p className="text-xs font-semibold tracking-[0.18em] text-mist-400 uppercase">{tile.label}</p>
                  <p className={cn('mt-3 font-display text-5xl leading-none', hot ? 'text-gold-300' : 'text-ivory-50')}>{value}</p>
                  <p className="mt-2 text-xs text-mist-500">{tile.hint}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Panel title="Recent activity" className="mt-10">
        {activity.isPending ? (
          <LoadingState />
        ) : activity.isError ? (
          <ErrorState message={errorMessage(activity.error)} onRetry={() => activity.refetch()} />
        ) : activity.data.length === 0 ? (
          <p className="text-mist-400">Nothing yet. New sign-ups, requests, orders, and messages will appear here.</p>
        ) : (
          <ol className="divide-y divide-ink-700">
            {activity.data.map((event) => {
              const content = (
                <>
                  <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', KIND_STYLE[event.kind])} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ivory-50">{event.title}</span>
                    <span className="block truncate text-sm text-ivory-300 first-letter:uppercase">{event.detail}</span>
                  </span>
                  <time dateTime={event.at} className="shrink-0 text-xs text-mist-400">
                    {timeAgo(event.at)}
                  </time>
                </>
              );
              return (
                <li key={event.id}>
                  {event.href ? (
                    <Link to={event.href} className="flex items-start gap-4 py-3 hover:bg-ink-900">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </>
  );
}
