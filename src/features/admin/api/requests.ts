import type { QuotationStatus, RequestStatus } from '@/features/account/status';
import { ADMIN_PAGE_SIZE, check, db, pageRange, searchTerm, toPage, type Page } from './shared';

export interface RequestListItem {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  category: string;
  quantity: number;
  status: RequestStatus;
  created_at: string;
}

export interface AdminLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  position: number;
}

export interface AdminQuotation {
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
  responded_at: string | null;
  quotation_line_items: AdminLineItem[];
}

export interface RequestDetail extends RequestListItem {
  phone: string;
  description: string;
  width: number | null;
  depth: number | null;
  height: number | null;
  unit: string;
  dimension_notes: string | null;
  material: string;
  finish: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_date: string | null;
  delivery_location: string;
  customer_id: string;
  portfolio_projects: { slug: string; title: string } | null;
  request_attachments: { id: string; storage_path: string; file_name: string; size_bytes: number }[];
  quotations: AdminQuotation[];
  orders: { id: string; reference: string }[];
}

export async function listRequests(params: { status?: RequestStatus; search?: string; page?: number }): Promise<Page<RequestListItem>> {
  const page = params.page ?? 1;
  const [from, to] = pageRange(page);
  let query = db()
    .from('custom_requests')
    .select('id, reference, full_name, email, category, quantity, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (params.status) query = query.eq('status', params.status);
  const term = searchTerm(params.search);
  if (term) query = query.or(`reference.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error, count } = await query.returns<RequestListItem[]>();
  check({ data, error }, 'Could not load requests.');
  return toPage(data, count, page, ADMIN_PAGE_SIZE);
}

export async function getRequest(id: string): Promise<RequestDetail | null> {
  const result = await db()
    .from('custom_requests')
    .select(
      `*, portfolio_projects (slug, title),
       request_attachments (id, storage_path, file_name, size_bytes),
       quotations (*, quotation_line_items (*)),
       orders (id, reference)`,
    )
    .eq('id', id)
    .maybeSingle<RequestDetail>();
  const data = check(result, 'Could not load this request.');
  if (!data) return null;
  data.quotations.sort((a, b) => b.version - a.version);
  data.quotations.forEach((q) => q.quotation_line_items.sort((a, b) => a.position - b.position));
  return data;
}

export async function setRequestStatus(id: string, status: RequestStatus) {
  check(await db().from('custom_requests').update({ status }).eq('id', id), 'Could not update the status.');
}

/** Short-lived link to a private reference image. */
export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('request-attachments').createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// --- Quotations ----------------------------------------------------------------

export interface QuotationFields {
  scope: string;
  estimated_timeframe: string | null;
  estimated_completion_date: string | null;
  payment_terms: string | null;
  valid_until: string | null;
}

export async function createQuotation(requestId: string, currencyCode: string, nextVersion: number, createdBy: string) {
  const result = await db()
    .from('quotations')
    .insert({ request_id: requestId, currency_code: currencyCode, version: nextVersion, created_by: createdBy })
    .select('id')
    .single<{ id: string }>();
  return check(result, 'Could not create the quotation.');
}

export async function updateQuotation(id: string, fields: QuotationFields) {
  check(await db().from('quotations').update(fields).eq('id', id), 'Could not save the quotation.');
}

export async function deleteDraftQuotation(id: string) {
  check(await db().from('quotations').delete().eq('id', id).eq('status', 'draft'), 'Could not delete the draft.');
}

export async function withdrawQuotation(id: string) {
  check(await db().from('quotations').update({ status: 'withdrawn' }).eq('id', id).eq('status', 'sent'), 'Could not withdraw.');
}

/** Freezes the draft and shows it to the customer (server checks admin + line items). */
export async function sendQuotation(id: string) {
  check(await db().rpc('send_quotation', { p_quotation_id: id }), 'Could not send the quotation.');
}

export interface LineItemInput {
  description: string;
  quantity: number;
  unit_price_minor: number;
  position: number;
}

export async function addLineItem(quotationId: string, item: LineItemInput) {
  check(await db().from('quotation_line_items').insert({ quotation_id: quotationId, ...item }), 'Could not add the line item.');
}

export async function updateLineItem(id: string, item: Omit<LineItemInput, 'position'>) {
  check(await db().from('quotation_line_items').update(item).eq('id', id), 'Could not update the line item.');
}

export async function deleteLineItem(id: string) {
  check(await db().from('quotation_line_items').delete().eq('id', id), 'Could not remove the line item.');
}
