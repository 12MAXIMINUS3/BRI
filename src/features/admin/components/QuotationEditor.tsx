import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';
import { formatMoney, minorToInput, parseMoneyToMinor } from '@/lib/money';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextAreaField, TextField } from '@/components/ui/form/Field';
import { formatDate } from '@/features/account/components/format';
import { QUOTATION_STATUS } from '@/features/account/status';
import {
  addLineItem,
  deleteDraftQuotation,
  deleteLineItem,
  sendQuotation,
  updateQuotation,
  withdrawQuotation,
  type AdminQuotation,
  type QuotationFields,
} from '../api/requests';
import { adminKeys } from '../keys';

export function QuotationEditor({ quotation }: { quotation: AdminQuotation }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
  const isDraft = quotation.status === 'draft';
  const money = (minor: number) => formatMoney(Number(minor), quotation.currency_code);
  const status = QUOTATION_STATUS[quotation.status];
  const [confirm, setConfirm] = useState<'send' | 'withdraw' | 'delete' | null>(null);

  const [fields, setFields] = useState<QuotationFields>({
    scope: quotation.scope,
    estimated_timeframe: quotation.estimated_timeframe,
    estimated_completion_date: quotation.estimated_completion_date,
    payment_terms: quotation.payment_terms,
    valid_until: quotation.valid_until,
  });
  const field = (key: keyof QuotationFields) => ({
    value: fields[key] ?? '',
    onChange: (e: { target: { value: string } }) => setFields((f) => ({ ...f, [key]: e.target.value || null })),
    disabled: !isDraft,
  });

  const save = useMutation({ mutationFn: () => updateQuotation(quotation.id, { ...fields, scope: fields.scope ?? '' }), onSuccess: refresh });
  const action = useMutation({
    mutationFn: async (kind: 'send' | 'withdraw' | 'delete') => {
      if (kind === 'send') {
        await updateQuotation(quotation.id, { ...fields, scope: fields.scope ?? '' });
        await sendQuotation(quotation.id);
      } else if (kind === 'withdraw') await withdrawQuotation(quotation.id);
      else await deleteDraftQuotation(quotation.id);
    },
    onSettled: () => {
      setConfirm(null);
      void refresh();
    },
  });

  // New line item
  const [item, setItem] = useState({ description: '', quantity: '1', price: '' });
  const [itemError, setItemError] = useState<string | null>(null);
  const addItem = useMutation({
    mutationFn: (input: { description: string; quantity: number; unit_price_minor: number }) =>
      addLineItem(quotation.id, { ...input, position: quotation.quotation_line_items.length }),
    onSuccess: () => {
      setItem({ description: '', quantity: '1', price: '' });
      void refresh();
    },
  });
  const removeItem = useMutation({ mutationFn: deleteLineItem, onSuccess: refresh });

  const submitItem = (e: FormEvent) => {
    e.preventDefault();
    const quantity = Number(item.quantity);
    const unitPrice = parseMoneyToMinor(item.price, quotation.currency_code);
    if (!item.description.trim()) return setItemError('Describe the item.');
    if (!Number.isFinite(quantity) || quantity <= 0) return setItemError('Quantity must be greater than zero.');
    if (unitPrice === null) return setItemError(`Enter a valid price in ${quotation.currency_code}.`);
    setItemError(null);
    addItem.mutate({ description: item.description.trim(), quantity, unit_price_minor: unitPrice });
  };

  const error = save.error ?? action.error ?? addItem.error ?? removeItem.error;

  return (
    <div className="rounded-sm border border-gold-500/30 bg-ink-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl">Quotation v{quotation.version}</h3>
        <div className="flex items-center gap-3">
          {quotation.sent_at && <span className="text-xs text-mist-400">Sent {formatDate(quotation.sent_at)}</span>}
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <TextAreaField label="Scope of work" rows={4} hint="What's included, shown to the customer." {...field('scope')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Estimated timeframe" placeholder="e.g. 6–8 weeks" {...field('estimated_timeframe')} />
          <TextField label="Estimated completion" type="date" {...field('estimated_completion_date')} />
          <TextField label="Valid until" type="date" {...field('valid_until')} />
        </div>
        <TextAreaField label="Payment terms" rows={3} placeholder="e.g. 50% deposit to begin, balance before delivery" {...field('payment_terms')} />
        {isDraft && (
          <div>
            <Button size="sm" variant="secondary" loading={save.isPending} onClick={() => save.mutate()}>
              Save Draft
            </Button>
            {save.isSuccess && <span className="ml-3 text-sm text-gold-300">Saved</span>}
          </div>
        )}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <caption className="sr-only">Line items</caption>
          <thead>
            <tr className="border-b border-ink-700 text-left text-mist-400">
              <th scope="col" className="py-2 pr-3 font-medium">Item</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Qty</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Unit price</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Total</th>
              {isDraft && <th scope="col"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {quotation.quotation_line_items.map((li) => (
              <tr key={li.id} className="border-b border-ink-700/60">
                <td className="py-2.5 pr-3 text-ivory-200">{li.description}</td>
                <td className="py-2.5 pr-3 text-right">{Number(li.quantity)}</td>
                <td className="py-2.5 pr-3 text-right">{money(li.unit_price_minor)}</td>
                <td className="py-2.5 pr-3 text-right text-ivory-50">{money(li.line_total_minor)}</td>
                {isDraft && (
                  <td className="py-2.5 text-right">
                    <button type="button" className="text-xs text-mist-400 hover:text-[#f2a08c]" onClick={() => removeItem.mutate(li.id)}>
                      Remove<span className="sr-only"> {li.description}</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {quotation.quotation_line_items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-mist-500">No line items yet.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="pt-3 pr-3 text-right font-medium">Total</th>
              <td className="pt-3 pr-3 text-right font-display text-2xl text-gold-300">{money(quotation.total_minor)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isDraft && (
        <form onSubmit={submitItem} className="mt-5 grid gap-3 rounded-sm border border-ink-700 bg-ink-850 p-4 sm:grid-cols-[1fr_6rem_9rem_auto] sm:items-end">
          <TextField label="New item" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} placeholder="e.g. Walnut table, oiled" />
          <TextField label="Qty" inputMode="decimal" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
          <TextField label={`Unit price (${quotation.currency_code})`} inputMode="decimal" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} placeholder={minorToInput(0, quotation.currency_code)} />
          <Button type="submit" size="sm" loading={addItem.isPending} className="h-[2.95rem]">
            Add
          </Button>
          {itemError && <p className="text-sm text-[#f2a08c] sm:col-span-4">{itemError}</p>}
        </form>
      )}

      {error && (
        <Alert tone="error" className="mt-5">
          {errorMessage(error)}
        </Alert>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {isDraft && (
          <>
            <Button onClick={() => setConfirm('send')} disabled={quotation.quotation_line_items.length === 0}>
              Send to Customer
            </Button>
            <Button variant="ghost" onClick={() => setConfirm('delete')}>
              Delete Draft
            </Button>
          </>
        )}
        {quotation.status === 'sent' && (
          <Button variant="secondary" onClick={() => setConfirm('withdraw')}>
            Withdraw Quotation
          </Button>
        )}
      </div>

      <Dialog
        open={confirm !== null}
        onClose={() => !action.isPending && setConfirm(null)}
        title={confirm === 'send' ? 'Send this quotation?' : confirm === 'withdraw' ? 'Withdraw this quotation?' : 'Delete this draft?'}
      >
        <p className="leading-relaxed text-ivory-200">
          {confirm === 'send'
            ? `The customer will see it in their account and can accept or decline. Once sent it can't be edited; to change it, withdraw it and create a new version. Total: ${money(quotation.total_minor)}.`
            : confirm === 'withdraw'
              ? 'The customer will no longer be able to accept it. You can then create a revised version.'
              : 'This draft and its line items will be removed.'}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(null)} disabled={action.isPending}>
            Cancel
          </Button>
          <Button loading={action.isPending} onClick={() => confirm && action.mutate(confirm)}>
            {confirm === 'send' ? 'Send' : confirm === 'withdraw' ? 'Withdraw' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
