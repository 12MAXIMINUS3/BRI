import { useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { Quotation } from '../api';
import { useRespondToQuotation } from '../hooks';
import { QUOTATION_STATUS } from '../status';
import { formatDate } from './format';

export function QuotationCard({ quotation }: { quotation: Quotation }) {
  const [confirming, setConfirming] = useState<'accept' | 'decline' | null>(null);
  const respond = useRespondToQuotation();
  const status = QUOTATION_STATUS[quotation.status];
  const money = (minor: number) => formatMoney(minor, quotation.currency_code);
  const canRespond = quotation.status === 'sent';

  const submit = async (accept: boolean) => {
    try {
      await respond.mutateAsync({ quotationId: quotation.id, accept });
      setConfirming(null);
    } catch {
      setConfirming(null);
    }
  };

  return (
    <div className="rounded-sm border border-gold-500/30 bg-ink-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-2xl">Quotation {quotation.version > 1 ? `v${quotation.version}` : ''}</h4>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {quotation.scope && <p className="mt-3 leading-relaxed whitespace-pre-line text-ivory-200">{quotation.scope}</p>}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="sr-only">Quotation line items</caption>
          <thead>
            <tr className="border-b border-ink-700 text-left text-mist-400">
              <th scope="col" className="py-2 pr-4 font-medium">Item</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Qty</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Unit price</th>
              <th scope="col" className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.quotation_line_items.map((item) => (
              <tr key={item.id} className="border-b border-ink-700/60">
                <td className="py-2.5 pr-4 text-ivory-200">{item.description}</td>
                <td className="py-2.5 pr-4 text-right text-ivory-300">{Number(item.quantity)}</td>
                <td className="py-2.5 pr-4 text-right text-ivory-300">{money(Number(item.unit_price_minor))}</td>
                <td className="py-2.5 text-right text-ivory-50">{money(Number(item.line_total_minor))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="pt-3 pr-4 text-right font-medium text-ivory-200">
                Total
              </th>
              <td className="pt-3 text-right font-display text-2xl text-gold-300">{money(Number(quotation.total_minor))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        {quotation.estimated_timeframe && <Detail label="Estimated timeframe" value={quotation.estimated_timeframe} />}
        {quotation.estimated_completion_date && (
          <Detail label="Estimated completion" value={formatDate(quotation.estimated_completion_date)} />
        )}
        {quotation.valid_until && <Detail label="Valid until" value={formatDate(quotation.valid_until)} />}
        {quotation.payment_terms && <Detail label="Payment terms" value={quotation.payment_terms} wide />}
      </dl>

      {respond.isError && (
        <Alert tone="error" className="mt-5">
          {errorMessage(respond.error)}
        </Alert>
      )}

      {canRespond && (
        <>
          <p className="mt-5 text-sm text-mist-400">
            Accepting confirms the order at this price. Payment is arranged with us directly; nothing is charged here.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setConfirming('accept')} disabled={respond.isPending}>
              Accept Quotation
            </Button>
            <Button variant="secondary" onClick={() => setConfirming('decline')} disabled={respond.isPending}>
              Decline
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={confirming !== null}
        onClose={() => !respond.isPending && setConfirming(null)}
        title={confirming === 'accept' ? 'Accept this quotation?' : 'Decline this quotation?'}
      >
        <p className="leading-relaxed text-ivory-200">
          {confirming === 'accept'
            ? `This confirms your order for ${money(Number(quotation.total_minor))}. We'll be in touch about payment and scheduling.`
            : "We'll let the workshop know. You can still contact us if you'd like a revised quotation."}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirming(null)} disabled={respond.isPending}>
            Cancel
          </Button>
          <Button
            variant={confirming === 'accept' ? 'primary' : 'secondary'}
            loading={respond.isPending}
            onClick={() => submit(confirming === 'accept')}
          >
            {confirming === 'accept' ? 'Yes, Accept' : 'Yes, Decline'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-mist-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-ivory-200">{value}</dd>
    </div>
  );
}
