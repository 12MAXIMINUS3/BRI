// Applies the Supabase migrations to PGlite (real Postgres in WASM) with
// minimal stand-ins for Supabase's auth/storage schemas, then checks the
// security rules and transactional functions.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = process.argv[2] ?? fileURLToPath(new URL("../migrations", import.meta.url));
const db = new PGlite({ extensions: { pgcrypto } });

const stub = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema extensions; create schema auth; create schema storage;
grant usage on schema public, extensions to anon, authenticated;
grant usage on schema auth, storage to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text, owner uuid);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
`;

let passed = 0;
let failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✓', label); }
  else { failed++; console.log('  ✗', label); }
}
async function expectError(promise, pattern, label) {
  try { await promise; ok(false, `${label} (no error raised)`); }
  catch (e) { ok(pattern.test(e.message), `${label} → "${e.message}"`); }
}
async function as(role, uid) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`);
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

await db.exec(stub);
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(join(migrationsDir, file), 'utf8')); console.log('applied', file); }
  catch (e) { console.log('FAILED', file, '\n ', e.message); process.exit(1); }
}

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'a@example.com', '{"full_name":"Customer A","role":"admin"}'),
    ('${B}', 'b@example.com', '{}'),
    ('${C}', 'owner@example.com', '{}');`);

console.log('\nProfiles and roles');
ok((await one(`select role from public.profiles where id = $1`, [A])).role === 'customer', 'sign-up metadata cannot grant admin');
ok((await one(`select email from public.profiles where id = $1`, [A])).email === 'a@example.com', 'profile email copied from sign-up');
await db.exec(`update auth.users set email = 'a2@example.com' where id = '${A}'`);
ok((await one(`select email from public.profiles where id = $1`, [A])).email === 'a2@example.com', 'profile email follows email changes');
await db.exec(`update auth.users set email = 'a@example.com' where id = '${A}'`);
await as('authenticated', A);
await expectError(db.query(`update public.profiles set role = 'admin' where id = $1`, [A]), /permission denied/, 'customer cannot change own role');
await expectError(db.query(`update public.profiles set email = 'x@example.com' where id = $1`, [A]), /permission denied/, 'customer cannot change profile email');
await db.query(`update public.profiles set full_name = 'A Renamed' where id = $1`, [A]);
ok((await one(`select full_name from public.profiles where id = $1`, [A])).full_name === 'A Renamed', 'customer can edit own name');
const r = await db.query(`update public.profiles set full_name = 'hacked' where id = $1`, [B]);
ok(r.affectedRows === 0, 'customer cannot edit another profile');
await expectError(db.query(`select public.promote_to_admin('a@example.com')`), /permission denied/, 'customer cannot call promote_to_admin');
await as('postgres');
await db.query(`select public.promote_to_admin('owner@example.com')`);
ok((await one(`select role from public.profiles where id = $1`, [C])).role === 'admin', 'SQL editor can create the first admin');

console.log('\nPublic access');
await as('anon');
ok(Number((await one(`select count(*) from public.products`)).count) === 7, 'anon reads 7 published products');
ok(Number((await one(`select count(*) from public.portfolio_projects`)).count) === 8, 'anon reads 8 published projects');
await as('postgres');
await db.exec(`update public.products set status = 'draft' where slug = 'oak-coat-rack'`);
await as('anon');
ok(Number((await one(`select count(*) from public.products`)).count) === 6, 'drafts are hidden from the public');
await expectError(db.query(`select * from public.profiles`), /permission denied/, 'anon cannot read profiles');
await expectError(db.query(`select * from public.orders`), /permission denied/, 'anon cannot read orders');
await expectError(db.query(`select * from public.contact_inquiries`), /permission denied/, 'anon cannot read inquiries');
await expectError(db.query(`update public.products set price_minor = 1`), /permission denied/, 'anon cannot change prices');

console.log('\nContact form abuse protection');
for (let i = 0; i < 3; i++) {
  await db.query(`select public.submit_contact_inquiry('Pat', 'pat@example.com', '', 'General question', 'Hello there, a question.', '')`);
}
await expectError(db.query(`select public.submit_contact_inquiry('Pat', 'pat@example.com', '', 'General question', 'Hello there, a question.', '')`), /Too many messages/, '4th message within an hour is rejected');
await db.query(`select public.submit_contact_inquiry('Bot', 'bot@example.com', '', 'x', 'spam spam spam spam', 'http://spam')`);
await as('postgres');
ok(Number((await one(`select count(*) from public.contact_inquiries where email = 'bot@example.com'`)).count) === 0, 'honeypot submissions are silently dropped');

console.log('\nCustom requests');
await as('authenticated', A);
const reqArgs = `'11111111-1111-1111-1111-111111111111', 'Customer A', 'a@example.com', '+1 555 010 0000', 'tables', 'A round dining table for six people.', 140, null, 75, 'cm', null, 'need-advice', 'Natural oil', 1, 500, 900, null, 'City centre', 'walnut-dining-table'`;
const req1 = await one(`select * from public.submit_custom_request(${reqArgs})`);
const req2 = await one(`select * from public.submit_custom_request(${reqArgs})`);
ok(req1.id === req2.id && /^CR-\d{5}$/.test(req1.reference), `duplicate submission returns the same request (${req1.reference})`);
ok(Number((await one(`select count(*) from public.custom_requests`)).count) === 1, 'only one request row exists');
await expectError(db.query(`select * from public.submit_custom_request('22222222-2222-2222-2222-222222222222', 'A', 'bad', '1', 'tables', 'short', null, null, null, 'cm', null, 'x', 'y', 0, null, null, null, 'z', null)`), /violates check constraint/, 'backend rejects invalid input');
await expectError(db.query(`update public.custom_requests set status = 'accepted'`).then((res) => { if (res.affectedRows === 0) throw new Error('0 rows updated'); }), /0 rows|permission/, 'customer cannot change request status');
await as('anon');
await expectError(db.query(`select * from public.submit_custom_request(${reqArgs})`), /permission denied|sign in/, 'anonymous visitors cannot submit');
await as('authenticated', B);
ok(Number((await one(`select count(*) from public.custom_requests`)).count) === 0, "customer B cannot see A's request");

console.log('\nStorage');
await as('authenticated', A);
await db.query(`insert into storage.objects (bucket_id, name) values ('request-attachments', $1)`, [`${A}/${req1.id}/ref.jpg`]);
ok(true, 'customer uploads to own request folder');
await expectError(db.query(`insert into storage.objects (bucket_id, name) values ('request-attachments', $1)`, [`${B}/${req1.id}/x.jpg`]), /row-level security/, "customer cannot upload into another user's folder");
await expectError(db.query(`insert into storage.objects (bucket_id, name) values ('catalog-images', 'x.jpg')`), /row-level security/, 'customer cannot upload catalogue images');
await db.query(`insert into public.request_attachments (request_id, storage_path, file_name, mime_type, size_bytes) values ($1, $2, 'ref.jpg', 'image/jpeg', 1000)`, [req1.id, `${A}/${req1.id}/ref.jpg`]);
ok(true, 'customer records attachment for own request');
await as('authenticated', B);
ok(Number((await one(`select count(*) from storage.objects`)).count) === 0, "customer B cannot see A's files");

console.log('\nReady-made orders and inventory');
await as('authenticated', A);
const productId = (await one(`select id from public.products where slug = 'oak-side-table'`)).id;
await expectError(db.query(`select * from public.request_product_order('33333333-3333-3333-3333-333333333333', $1, 1)`, [productId]), /currency has not been configured/, 'orders require a configured currency');
await as('postgres');
await db.exec(`update public.business_settings set currency_code = 'USD', payment_instructions = 'Pay by bank transfer after confirmation.'`);
await as('authenticated', A);
const o1 = await one(`select * from public.request_product_order('33333333-3333-3333-3333-333333333333', $1, 4)`, [productId]);
const o1b = await one(`select * from public.request_product_order('33333333-3333-3333-3333-333333333333', $1, 4)`, [productId]);
ok(o1.id === o1b.id, 'retried order request does not duplicate');
ok(Number((await one(`select stock_quantity from public.products where id = $1`, [productId])).stock_quantity) === 0, 'stock reserved once (4 → 0)');
const order = await one(`select * from public.orders where id = $1`, [o1.id]);
ok(Number(order.total_minor) === 128000 && order.payment_status === 'unpaid' && order.status === 'pending_confirmation', 'total from DB price, unpaid, awaiting confirmation');
await as('authenticated', B);
await expectError(db.query(`select * from public.request_product_order('44444444-4444-4444-4444-444444444444', $1, 1)`, [productId]), /Only 0 left/, 'overselling is prevented');
await as('authenticated', A);
const upd = await db.query(`update public.orders set payment_status = 'paid', total_minor = 1 where id = $1`, [o1.id]);
ok(upd.affectedRows === 0, 'customer cannot mark order paid or change total');

console.log('\nQuotations');
await as('authenticated', C);
const quote = await one(`insert into public.quotations (request_id, currency_code, scope, payment_terms) values ($1, 'USD', 'Round walnut table', '50% deposit') returning id`, [req1.id]);
await db.query(`insert into public.quotation_line_items (quotation_id, description, quantity, unit_price_minor) values ($1, 'Table', 1, 150000), ($1, 'Delivery', 1, 5000)`, [quote.id]);
ok(Number((await one(`select total_minor from public.quotations where id = $1`, [quote.id])).total_minor) === 155000, 'quotation total computed from line items');
await as('authenticated', A);
ok(Number((await one(`select count(*) from public.quotations`)).count) === 0, 'customer cannot see draft quotations');
await expectError(db.query(`select public.respond_to_quotation($1, true)`, [quote.id]), /can no longer be answered|not found/i, 'draft quotations cannot be accepted');
await expectError(db.query(`select public.send_quotation($1)`, [quote.id]), /Not allowed/, 'customer cannot send quotations');
await as('authenticated', C);
await db.query(`select public.send_quotation($1)`, [quote.id]);
await expectError(db.query(`update public.quotations set scope = 'changed' where id = $1`, [quote.id]), /cannot be edited/, 'sent quotations are frozen');
await expectError(db.query(`insert into public.quotation_line_items (quotation_id, description, unit_price_minor) values ($1, 'Extra', 1)`, [quote.id]), /only be changed while/, 'line items frozen after sending');
await as('authenticated', A);
ok((await one(`select status from public.custom_requests where id = $1`, [req1.id])).status === 'quotation_sent', 'request moves to quotation_sent');
ok(Number((await one(`select count(*) from public.quotation_line_items`)).count) === 2, 'customer sees line items once sent');
await as('authenticated', B);
await expectError(db.query(`select public.respond_to_quotation($1, true)`, [quote.id]), /not found/, "another customer cannot accept A's quotation");
await as('authenticated', A);
const orderId1 = (await one(`select public.respond_to_quotation($1, true) as id`, [quote.id])).id;
const orderId2 = (await one(`select public.respond_to_quotation($1, true) as id`, [quote.id])).id;
ok(orderId1 && orderId1 === orderId2, 'accepting twice returns the same order');
const customOrder = await one(`select * from public.orders where id = $1`, [orderId1]);
ok(customOrder.status === 'confirmed' && customOrder.payment_status === 'unpaid' && Number(customOrder.total_minor) === 155000, 'accepted quotation → confirmed, unpaid order with quotation total');
ok(Number((await one(`select count(*) from public.order_items where order_id = $1`, [orderId1])).count) === 2, 'order items copied from quotation');
ok((await one(`select status from public.custom_requests where id = $1`, [req1.id])).status === 'accepted', 'request marked accepted');
ok(Number((await one(`select count(*) from public.status_history`)).count) >= 3, 'customer sees status history of own records');

console.log('\nOrder management');
await as('authenticated', C);
await expectError(db.query(`update public.orders set status = 'completed' where id = $1`, [orderId1]), /cannot move from confirmed to completed/, 'invalid production transitions rejected');
await db.query(`update public.orders set status = 'in_production' where id = $1`, [orderId1]);
await db.query(`update public.orders set payment_status = 'deposit_paid' where id = $1`, [orderId1]);
ok(true, 'admin advances production and records payment separately');
await db.query(`update public.orders set status = 'cancelled', cancellation_reason = 'Customer changed mind' where id = $1`, [o1.id]);
ok(Number((await one(`select stock_quantity from public.products where id = $1`, [productId])).stock_quantity) === 4, 'cancelling a ready-made order restores stock');
await expectError(db.query(`update public.orders set total_minor = 5 where id = $1`, [orderId1]), /cannot be changed/, 'even admins cannot rewrite order totals');
ok(Number((await one(`select count(*) from public.contact_inquiries`)).count) === 3, 'admin reads contact inquiries');
await db.query(`insert into public.admin_notes (entity_type, entity_id, body) values ('custom_request', $1, 'Prefers darker oil')`, [req1.id]);
await as('authenticated', A);
ok(Number((await one(`select count(*) from public.admin_notes`)).count) === 0, 'customers cannot read internal notes (0 of 1 visible)');


console.log("\nDemo photos");
await as("anon");
ok(Number((await one("select count(*) from public.portfolio_images where storage_path is null")).count) === 0, "every demo project image has a sample photo");
ok(Number((await one("select count(*) from public.product_images where storage_path is null")).count) === 0, "every demo product image has a sample photo");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
