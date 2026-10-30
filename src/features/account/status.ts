import type { BadgeTone } from '@/components/ui/Badge';

export type RequestStatus = 'submitted' | 'under_review' | 'quotation_sent' | 'accepted' | 'declined' | 'cancelled';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
export type OrderStatus = 'pending_confirmation' | 'confirmed' | 'in_production' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded';

type Label = { label: string; tone: BadgeTone };

export const REQUEST_STATUS: Record<RequestStatus, Label> = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  under_review: { label: 'Under review', tone: 'info' },
  quotation_sent: { label: 'Quotation ready', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export const QUOTATION_STATUS: Record<QuotationStatus, Label> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Awaiting your response', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'danger' },
};

export const ORDER_STATUS: Record<OrderStatus, Label> = {
  pending_confirmation: { label: 'Awaiting confirmation', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  in_production: { label: 'In production', tone: 'info' },
  ready: { label: 'Ready', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, Label> = {
  unpaid: { label: 'Payment not yet received', tone: 'neutral' },
  deposit_paid: { label: 'Deposit received', tone: 'info' },
  paid: { label: 'Paid in full', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

/** Production steps shown as a progress tracker on orders. */
export const ORDER_STEPS: OrderStatus[] = ['confirmed', 'in_production', 'ready', 'completed'];
