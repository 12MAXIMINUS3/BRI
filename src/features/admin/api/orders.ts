import type { OrderStatus, PaymentStatus } from '@/features/account/status';
import { check, db, pageRange, toPage, type Page } from './shared';

export interface OrderListItem {
  id: string;
  reference: string;
  source: 'custom' | 'ready_made';
  status: OrderStatus;
  payment_status: PaymentStatus;
  currency_code: string;
  total_minor: number;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export interface OrderDetail extends OrderListItem {
  estimated_completion_date: string | null;
  payment_instructions: string | null;
  customer_note: string | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
  custom_requests: { id: string; reference: string; phone: string; delivery_location: string } | null;
  order_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price_minor: number;
    line_total_minor: number;
    product_id: string | null;
    products: { slug: string; stock_quantity: number } | null;
  }[];
}

/** Production transitions allowed by the database trigger. */
export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'ready', 'cancelled'],
  in_production: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function listOrders(params: {
  status?: OrderStatus;
  payment?: PaymentStatus;
  source?: 'custom' | 'ready_made';
  page?: number;
}): Promise<Page<OrderListItem>> {
  const page = params.page ?? 1;
  const [from, to] = pageRange(page);
  let query = db()
    .from('orders')
    .select(
      'id, reference, source, status, payment_status, currency_code, total_minor, created_at, profiles (full_name, email)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);
  if (params.status) query = query.eq('status', params.status);
  if (params.payment) query = query.eq('payment_status', params.payment);
  if (params.source) query = query.eq('source', params.source);
  const { data, error, count } = await query.returns<OrderListItem[]>();
  check({ data, error }, 'Could not load orders.');
  return toPage(data, count, page);
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  const result = await db()
    .from('orders')
    .select(
      `*, profiles (full_name, email, phone),
       custom_requests (id, reference, phone, delivery_location),
       order_items (id, description, quantity, unit_price_minor, line_total_minor, product_id, products (slug, stock_quantity))`,
    )
    .eq('id', id)
    .maybeSingle<OrderDetail>();
  return check(result, 'Could not load this order.');
}

export interface OrderUpdate {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  estimated_completion_date?: string | null;
  payment_instructions?: string | null;
  cancellation_reason?: string | null;
}

/** The database enforces valid transitions and returns stock when a ready-made order is cancelled. */
export async function updateOrder(id: string, changes: OrderUpdate) {
  check(await db().from('orders').update(changes).eq('id', id), 'Could not update the order.');
}
