import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';
import { Alert } from '@/components/ui/Alert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate } from '@/features/account/components/format';
import { deleteInquiry, listInquiries, setInquiryStatus, type Inquiry, type InquiryStatus } from '../api/misc';
import { AdminPageHeader, FilterBar } from '../components/AdminUi';
import { SelectFilter, useListParams } from '../components/ListControls';
import { NotesPanel } from '../components/NotesPanel';
import { adminKeys } from '../keys';

const INQUIRY_STATUS: Record<InquiryStatus, { label: string; tone: BadgeTone }> = {
  new: { label: 'New', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  closed: { label: 'Closed', tone: 'success' },
  spam: { label: 'Spam', tone: 'danger' },
};

export function InquiriesPage() {
  const { values, page, set } = useListParams(['status'] as const);
  const params = { status: (values.status || undefined) as InquiryStatus | undefined, page };
  const list = useQuery({ queryKey: adminKeys.inquiries(params), queryFn: () => listInquiries(params), placeholderData: keepPreviousData });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <AdminPageHeader title="Messages" description="Messages sent through the contact form." />
      <FilterBar>
        <SelectFilter
          id="inquiry-status"
          label="Status"
          value={values.status}
          onChange={(v) => set({ status: v })}
          options={Object.entries(INQUIRY_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
      </FilterBar>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-ink-600 p-10 text-center text-mist-400">No messages.</p>
      ) : (
        <>
          <ul className="grid gap-3">
            {list.data.items.map((inquiry) => (
              <li key={inquiry.id}>
                <InquiryRow inquiry={inquiry} open={openId === inquiry.id} onToggle={() => setOpenId(openId === inquiry.id ? null : inquiry.id)} />
              </li>
            ))}
          </ul>
          <Pagination className="mt-6" page={list.data.page} pageCount={list.data.pageCount} onPageChange={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}

function InquiryRow({ inquiry, open, onToggle }: { inquiry: Inquiry; open: boolean; onToggle: () => void }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
  const status = useMutation({ mutationFn: (s: InquiryStatus) => setInquiryStatus(inquiry.id, s), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => deleteInquiry(inquiry.id), onSuccess: refresh });
  const s = INQUIRY_STATUS[inquiry.status];

  return (
    <article className={cn('rounded-sm border bg-ink-850', inquiry.status === 'new' ? 'border-gold-500/40' : 'border-ink-700')}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left hover:bg-ink-900">
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ivory-50">{inquiry.subject}</span>
          <span className="block truncate text-sm text-mist-400">
            {inquiry.name} · {inquiry.email}
          </span>
        </span>
        <span className="text-xs text-mist-400">{formatDate(inquiry.created_at)}</span>
        <Badge tone={s.tone}>{s.label}</Badge>
      </button>
      {open && (
        <div className="grid gap-6 border-t border-ink-700 p-4 lg:grid-cols-2">
          <div>
            <p className="leading-relaxed whitespace-pre-line text-ivory-200">{inquiry.message}</p>
            <p className="mt-4 text-sm">
              <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.subject}`)}`} className="text-gold-300 underline">
                Reply by email
              </a>
              {inquiry.phone && (
                <>
                  {' · '}
                  <a href={`tel:${inquiry.phone.replace(/\s/g, '')}`} className="text-gold-300 underline">
                    {inquiry.phone}
                  </a>
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(Object.keys(INQUIRY_STATUS) as InquiryStatus[])
                .filter((k) => k !== inquiry.status)
                .map((k) => (
                  <Button key={k} size="sm" variant="secondary" loading={status.isPending && status.variables === k} onClick={() => status.mutate(k)}>
                    Mark {INQUIRY_STATUS[k].label}
                  </Button>
                ))}
              <Button size="sm" variant="ghost" loading={remove.isPending} onClick={() => remove.mutate()}>
                Delete
              </Button>
            </div>
            {(status.isError || remove.isError) && <Alert tone="error" className="mt-4">{errorMessage(status.error ?? remove.error)}</Alert>}
          </div>
          <NotesPanel entityType="contact_inquiry" entityId={inquiry.id} />
        </div>
      )}
    </article>
  );
}
