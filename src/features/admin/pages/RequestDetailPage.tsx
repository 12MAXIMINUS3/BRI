import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { business } from '@/config/business';
import { categoryLabel, NEED_ADVICE } from '@/config/catalog';
import { errorMessage } from '@/lib/errors';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDate } from '@/features/account/components/format';
import { REQUEST_STATUS } from '@/features/account/status';
import { attachmentUrl, createQuotation, getRequest, setRequestStatus } from '../api/requests';
import { AdminPageHeader, DetailList, Panel } from '../components/AdminUi';
import { NotesPanel } from '../components/NotesPanel';
import { QuotationEditor } from '../components/QuotationEditor';
import { adminKeys } from '../keys';

const advice = (v: string) => (v === NEED_ADVICE ? 'Needs advice' : v);

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const request = useQuery({ queryKey: adminKeys.request(id), queryFn: () => getRequest(id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });

  const changeStatus = useMutation({ mutationFn: (s: 'under_review' | 'cancelled') => setRequestStatus(id, s), onSuccess: refresh });
  const newQuote = useMutation({
    mutationFn: () => {
      const versions = request.data?.quotations.map((q) => q.version) ?? [];
      return createQuotation(id, business.currencyCode, Math.max(0, ...versions) + 1, user!.id);
    },
    onSuccess: refresh,
  });

  if (request.isPending) return <LoadingState />;
  if (request.isError) return <ErrorState message={errorMessage(request.error)} onRetry={() => request.refetch()} />;
  const r = request.data;
  if (!r) return <ErrorState title="Request not found" />;

  const status = REQUEST_STATUS[r.status];
  const open = ['submitted', 'under_review', 'quotation_sent', 'declined'].includes(r.status);
  const hasOpenQuote = r.quotations.some((q) => q.status === 'draft' || q.status === 'sent');
  const dims = [r.width && `W ${r.width}`, r.depth && `D ${r.depth}`, r.height && `H ${r.height}`].filter(Boolean).join(' × ');

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/requests', label: 'All requests' }}
        title={
          <span className="flex flex-wrap items-center gap-4">
            {r.reference} <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        description={`${categoryLabel(r.category)} · received ${formatDate(r.created_at)}`}
        actions={
          <>
            {r.status === 'submitted' && (
              <Button size="sm" variant="secondary" loading={changeStatus.isPending} onClick={() => changeStatus.mutate('under_review')}>
                Mark Under Review
              </Button>
            )}
            {open && (
              <Button size="sm" variant="ghost" loading={changeStatus.isPending} onClick={() => changeStatus.mutate('cancelled')}>
                Cancel Request
              </Button>
            )}
          </>
        }
      />
      {changeStatus.isError && <Alert tone="error" className="mb-6">{errorMessage(changeStatus.error)}</Alert>}
      {r.orders.length > 0 && (
        <Alert tone="success" className="mb-6" title="Quotation accepted">
          Order created:{' '}
          <Link to={`/admin/orders/${r.orders[0]!.id}`} className="font-semibold underline">
            {r.orders[0]!.reference}
          </Link>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid content-start gap-6 xl:col-span-2">
          <Panel title="What they asked for">
            <p className="leading-relaxed whitespace-pre-line text-ivory-200">{r.description}</p>
            <div className="mt-6">
              <DetailList
                items={[
                  ['Quantity', r.quantity],
                  ['Dimensions', dims ? `${dims} ${r.unit}` : 'Not given'],
                  ['Size notes', r.dimension_notes],
                  ['Material', advice(r.material)],
                  ['Finish', advice(r.finish)],
                  ['Budget', r.budget_min || r.budget_max ? `${r.budget_min ?? '…'} – ${r.budget_max ?? '…'} ${business.currencyCode}` : 'Not given'],
                  ['Preferred date', r.preferred_date ? formatDate(r.preferred_date) : 'Flexible'],
                  ['Delivery location', r.delivery_location],
                  [
                    'Reference project',
                    r.portfolio_projects ? (
                      <Link to={`/work/${r.portfolio_projects.slug}`} target="_blank" className="text-gold-300 underline">
                        {r.portfolio_projects.title}
                      </Link>
                    ) : null,
                  ],
                ]}
              />
            </div>
          </Panel>

          {r.request_attachments.length > 0 && (
            <Panel title={`Reference images (${r.request_attachments.length})`}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {r.request_attachments.map((a) => (
                  <li key={a.id}>
                    <AttachmentThumb path={a.storage_path} name={a.file_name} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Quotations"
            actions={
              open && !hasOpenQuote ? (
                <Button size="sm" loading={newQuote.isPending} onClick={() => newQuote.mutate()} disabled={!business.currencyCode}>
                  {r.quotations.length ? 'New Version' : 'Create Quotation'}
                </Button>
              ) : null
            }
          >
            {!business.currencyCode && (
              <Alert tone="warning" className="mb-4">
                Set your currency in Settings before creating quotations.
              </Alert>
            )}
            {newQuote.isError && <Alert tone="error" className="mb-4">{errorMessage(newQuote.error)}</Alert>}
            {r.quotations.length === 0 ? (
              <p className="text-mist-400">No quotation yet.</p>
            ) : (
              <div className="grid gap-5">
                {r.quotations.map((q) => (
                  <QuotationEditor key={`${q.id}-${q.status}`} quotation={q} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Customer">
            <DetailList
              items={[
                ['Name', r.full_name],
                ['Email', <a href={`mailto:${r.email}`} className="text-gold-300 underline">{r.email}</a>],
                ['Phone', <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="text-gold-300 underline">{r.phone}</a>],
              ]}
            />
          </Panel>
          <NotesPanel entityType="custom_request" entityId={r.id} />
        </div>
      </div>
    </>
  );
}

function AttachmentThumb({ path, name }: { path: string; name: string }) {
  const url = useQuery({ queryKey: ['admin', 'attachment', path], queryFn: () => attachmentUrl(path), staleTime: 50 * 60_000 });
  return (
    <a
      href={url.data}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-sm border border-ink-700 bg-ink-900 hover:border-gold-500/60"
    >
      {url.data ? (
        <img src={url.data} alt={name} className="aspect-square w-full object-cover" loading="lazy" />
      ) : (
        <div className="aspect-square animate-pulse bg-ink-800" />
      )}
      <span className="block truncate px-2 py-1.5 text-xs text-mist-400">{name}</span>
    </a>
  );
}
