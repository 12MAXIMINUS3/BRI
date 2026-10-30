import { check, db, pageRange, searchTerm, toPage, type Page } from './shared';

// --- Contact inquiries --------------------------------------------------------------

export type InquiryStatus = 'new' | 'in_progress' | 'closed' | 'spam';

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

export async function listInquiries(params: { status?: InquiryStatus; page?: number }): Promise<Page<Inquiry>> {
  const page = params.page ?? 1;
  const [from, to] = pageRange(page);
  let query = db()
    .from('contact_inquiries')
    .select('id, name, email, phone, subject, message, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (params.status) query = query.eq('status', params.status);
  const { data, error, count } = await query.returns<Inquiry[]>();
  check({ data, error }, 'Could not load messages.');
  return toPage(data, count, page);
}

export async function setInquiryStatus(id: string, status: InquiryStatus) {
  check(await db().from('contact_inquiries').update({ status }).eq('id', id), 'Could not update the message.');
}

export async function deleteInquiry(id: string) {
  check(await db().from('contact_inquiries').delete().eq('id', id), 'Could not delete the message.');
}

// --- Customers ---------------------------------------------------------------------

export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  custom_requests: { count: number }[];
  orders: { count: number }[];
}

export async function listCustomers(params: { search?: string; page?: number }): Promise<Page<Customer>> {
  const page = params.page ?? 1;
  const [from, to] = pageRange(page);
  let query = db()
    .from('profiles')
    .select('id, full_name, email, phone, role, created_at, custom_requests (count), orders (count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  const term = searchTerm(params.search);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data, error, count } = await query.returns<Customer[]>();
  check({ data, error }, 'Could not load customers.');
  return toPage(data, count, page);
}

// --- Business settings -------------------------------------------------------------------

export interface BusinessSettings {
  business_name: string;
  tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  location: string | null;
  service_area: string | null;
  currency_code: string | null;
  locale: string | null;
  payment_instructions: string | null;
  updated_at: string;
}

export async function getSettings(): Promise<BusinessSettings> {
  // .single() errors when the row is missing, so data is non-null after check().
  return check(
    await db().from('business_settings').select('*').eq('id', true).single<BusinessSettings>(),
    'Could not load settings.',
  )!;
}

export async function saveSettings(values: Omit<BusinessSettings, 'updated_at'>) {
  check(await db().from('business_settings').update(values).eq('id', true), 'Could not save settings.');
}

// --- Internal notes ------------------------------------------------------------------

export type NoteEntity = 'custom_request' | 'order' | 'contact_inquiry';

export interface AdminNote {
  id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export async function listNotes(entityType: NoteEntity, entityId: string): Promise<AdminNote[]> {
  return check(
    await db()
      .from('admin_notes')
      .select('id, body, created_at, profiles (full_name, email)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .returns<AdminNote[]>(),
    'Could not load notes.',
  ) ?? [];
}

export async function addNote(entityType: NoteEntity, entityId: string, body: string) {
  check(
    await db().from('admin_notes').insert({ entity_type: entityType, entity_id: entityId, body: body.trim() }),
    'Could not save the note.',
  );
}

export async function deleteNote(id: string) {
  check(await db().from('admin_notes').delete().eq('id', id), 'Could not delete the note.');
}

// --- Overview: counts and recent activity ------------------------------------------------------

export interface OverviewCounts {
  newRequests: number;
  quotationsAwaiting: number;
  pendingOrders: number;
  activeOrders: number;
  unpaidOrders: number;
  newInquiries: number;
  lowStock: number;
  customers: number;
}

async function count(table: string, apply: (q: any) => any = (q) => q): Promise<number> {
  const { count: total, error } = await apply(db().from(table).select('id', { count: 'exact', head: true }));
  if (error) throw new Error(error.message);
  return total ?? 0;
}

export async function getOverviewCounts(): Promise<OverviewCounts> {
  const [newRequests, quotationsAwaiting, pendingOrders, activeOrders, unpaidOrders, newInquiries, lowStock, customers] =
    await Promise.all([
      count('custom_requests', (q) => q.in('status', ['submitted', 'under_review'])),
      count('quotations', (q) => q.eq('status', 'sent')),
      count('orders', (q) => q.eq('status', 'pending_confirmation')),
      count('orders', (q) => q.in('status', ['confirmed', 'in_production', 'ready'])),
      count('orders', (q) => q.neq('status', 'cancelled').in('payment_status', ['unpaid', 'deposit_paid'])),
      count('contact_inquiries', (q) => q.eq('status', 'new')),
      count('products', (q) => q.eq('status', 'published').lte('stock_quantity', 2)),
      count('profiles', (q) => q.eq('role', 'customer')),
    ]);
  return { newRequests, quotationsAwaiting, pendingOrders, activeOrders, unpaidOrders, newInquiries, lowStock, customers };
}

export interface ActivityEvent {
  id: string;
  at: string;
  kind: 'signup' | 'request' | 'order' | 'inquiry' | 'status';
  title: string;
  detail: string;
  href: string | null;
}

const ENTITY_LABEL = { custom_request: 'Request', quotation: 'Quotation', order: 'Order' } as const;

/** Merges the latest events from several tables into one timeline. */
export async function getRecentActivity(limit = 25): Promise<ActivityEvent[]> {
  const [signups, requests, orders, inquiries, history] = await Promise.all([
    db().from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(10),
    db().from('custom_requests').select('id, reference, full_name, category, created_at').order('created_at', { ascending: false }).limit(10),
    db().from('orders').select('id, reference, source, created_at').order('created_at', { ascending: false }).limit(10),
    db().from('contact_inquiries').select('id, name, subject, created_at').order('created_at', { ascending: false }).limit(10),
    db()
      .from('status_history')
      .select('id, entity_type, entity_id, field, from_value, to_value, created_at')
      .not('from_value', 'is', null)
      .order('created_at', { ascending: false })
      .limit(15),
  ]);
  for (const r of [signups, requests, orders, inquiries, history]) if (r.error) throw new Error(r.error.message);

  const events: ActivityEvent[] = [
    ...(signups.data ?? []).map((p) => ({
      id: `s-${p.id}`,
      at: p.created_at,
      kind: 'signup' as const,
      title: 'New account',
      detail: p.full_name || p.email || 'Unnamed customer',
      href: '/admin/customers',
    })),
    ...(requests.data ?? []).map((r) => ({
      id: `r-${r.id}`,
      at: r.created_at,
      kind: 'request' as const,
      title: `Custom request ${r.reference}`,
      detail: `${r.full_name} · ${r.category}`,
      href: `/admin/requests/${r.id}`,
    })),
    ...(orders.data ?? []).map((o) => ({
      id: `o-${o.id}`,
      at: o.created_at,
      kind: 'order' as const,
      title: `Order ${o.reference}`,
      detail: o.source === 'custom' ? 'Quotation accepted' : 'Ready-made item requested',
      href: `/admin/orders/${o.id}`,
    })),
    ...(inquiries.data ?? []).map((i) => ({
      id: `i-${i.id}`,
      at: i.created_at,
      kind: 'inquiry' as const,
      title: 'New message',
      detail: `${i.name} · ${i.subject}`,
      href: '/admin/inquiries',
    })),
    ...(history.data ?? []).map((h) => ({
      id: `h-${h.id}`,
      at: h.created_at,
      kind: 'status' as const,
      title: `${ENTITY_LABEL[h.entity_type as keyof typeof ENTITY_LABEL]} ${h.field === 'payment_status' ? 'payment' : 'status'} changed`,
      detail: `${String(h.from_value).replace(/_/g, ' ')} → ${String(h.to_value).replace(/_/g, ' ')}`,
      href:
        h.entity_type === 'order'
          ? `/admin/orders/${h.entity_id}`
          : h.entity_type === 'custom_request'
            ? `/admin/requests/${h.entity_id}`
            : null,
    })),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
