import { requireSupabase, toError } from '@/lib/supabase';
import type { OrderStatus, PaymentStatus, QuotationStatus, RequestStatus } from './status';

/**
 * The signed-in customer's own records. Row Level Security limits every query
 * to the customer's rows and hides draft quotations, so no filtering by user
 * is needed (or trusted) here.
 */

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  position: number;
}

export interface Quotation {
  id: string;
  version: number;
  status: QuotationStatus;
  scope: string;
  currency_code: string;
  total_minor: number;
  estimated_timeframe: string | null;
  estimated_completion_date: string | null;
  payment_terms: string | null;
  valid_until: string | null;
  sent_at: string | null;
  quotation_line_items: QuotationLineItem[];
}

export interface CustomerRequest {
  id: string;
  reference: string;
  status: RequestStatus;
  category: string;
  description: string;
  quantity: number;
  created_at: string;
  quotations: Quotation[];
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

export interface CustomerOrder {
  id: string;
  reference: string;
  source: 'custom' | 'ready_made';
  status: OrderStatus;
  payment_status: PaymentStatus;
  currency_code: string;
  total_minor: number;
  estimated_completion_date: string | null;
  payment_instructions: string | null;
  created_at: string;
  order_items: OrderItem[];
  custom_requests: { reference: string } | null;
}

export async function listMyRequests(): Promise<CustomerRequest[]> {
  const { data, error } = await requireSupabase()
    .from('custom_requests')
    .select(
      `id, reference, status, category, description, quantity, created_at,
       quotations (id, version, status, scope, currency_code, total_minor, estimated_timeframe,
         estimated_completion_date, payment_terms, valid_until, sent_at,
         quotation_line_items (id, description, quantity, unit_price_minor, line_total_minor, position))`,
    )
    .order('created_at', { ascending: false })
    .returns<CustomerRequest[]>();
  if (error) throw toError(error, 'Could not load your requests.');
  return data.map((r) => ({
    ...r,
    quotations: [...r.quotations]
      .sort((a, b) => b.version - a.version)
      .map((q) => ({
        ...q,
        quotation_line_items: [...q.quotation_line_items].sort((a, b) => a.position - b.position),
      })),
  }));
}

export async function listMyOrders(): Promise<CustomerOrder[]> {
  const { data, error } = await requireSupabase()
    .from('orders')
    .select(
      `id, reference, source, status, payment_status, currency_code, total_minor, estimated_completion_date,
       payment_instructions, created_at,
       order_items (id, description, quantity, unit_price_minor, line_total_minor),
       custom_requests (reference)`,
    )
    .order('created_at', { ascending: false })
    .returns<CustomerOrder[]>();
  if (error) throw toError(error, 'Could not load your orders.');
  return data;
}

/**
 * Accepts or declines a quotation via the `respond_to_quotation` database
 * function. Acceptance creates the confirmed order on the server; it never
 * marks anything as paid. Returns the new order id when accepted.
 */
export async function respondToQuotation(quotationId: string, accept: boolean): Promise<string | null> {
  const { data, error } = await requireSupabase().rpc('respond_to_quotation', {
    p_quotation_id: quotationId,
    p_accept: accept,
  });
  if (error) throw toError(error, 'Could not record your response.');
  return (data as string | null) ?? null;
}
