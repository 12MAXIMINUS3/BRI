-- =============================================================================
-- Privileged operations
--
-- Each function runs as the table owner (SECURITY DEFINER) with an empty
-- search_path, checks who is calling, validates input, and never trusts
-- prices or totals from the browser.
-- =============================================================================

-- Supabase grants EXECUTE on new functions to everyone by default. Lock down
-- the helper/trigger functions; each RPC below grants only what it needs.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Business currency, required before prices can be quoted or ordered.
create function public.business_currency()
returns char(3)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  code char(3);
begin
  select currency_code into code from public.business_settings where id;
  if code is null then
    raise exception 'The business currency has not been configured yet' using errcode = 'P0001';
  end if;
  return code;
end;
$$;

revoke execute on function public.business_currency() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_custom_request: create a custom-order request for the signed-in user.
-- Idempotent: repeating a call with the same client token returns the
-- original request instead of creating a duplicate.
-- ---------------------------------------------------------------------------
create function public.submit_custom_request(
  p_client_token uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_category public.product_category,
  p_description text,
  p_width numeric,
  p_depth numeric,
  p_height numeric,
  p_unit public.measurement_unit,
  p_dimension_notes text,
  p_material text,
  p_finish text,
  p_quantity integer,
  p_budget_min numeric,
  p_budget_max numeric,
  p_preferred_date date,
  p_delivery_location text,
  p_reference_project_slug text
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing record;
  project_id uuid;
begin
  if uid is null then
    raise exception 'Please sign in to submit a request' using errcode = '42501';
  end if;
  if p_client_token is null then
    raise exception 'Missing submission token' using errcode = '22023';
  end if;

  select r.id, r.reference into existing
    from public.custom_requests r
   where r.customer_id = uid and r.client_token = p_client_token;
  if found then
    return query select existing.id, existing.reference;
    return;
  end if;

  -- Abuse protection: at most 10 new requests per customer per day.
  if (select count(*) from public.custom_requests r
       where r.customer_id = uid and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent several requests today. Please try again tomorrow or contact us directly.'
      using errcode = 'P0001';
  end if;

  if p_preferred_date is not null and p_preferred_date < current_date - 1 then
    raise exception 'The preferred date must be in the future' using errcode = '22023';
  end if;

  if nullif(trim(p_reference_project_slug), '') is not null then
    select pp.id into project_id from public.portfolio_projects pp
     where pp.slug = trim(p_reference_project_slug) and pp.status = 'published';
  end if;

  -- Column CHECK constraints validate lengths, formats, and ranges.
  return query
  insert into public.custom_requests as r (
    customer_id, client_token, full_name, email, phone, category, description,
    width, depth, height, unit, dimension_notes, material, finish, quantity,
    budget_min, budget_max, preferred_date, delivery_location, reference_project_id
  ) values (
    uid, p_client_token, trim(p_full_name), lower(trim(p_email)), trim(p_phone), p_category, trim(p_description),
    p_width, p_depth, p_height, coalesce(p_unit, 'cm'), nullif(trim(p_dimension_notes), ''),
    trim(p_material), trim(p_finish), p_quantity,
    p_budget_min, p_budget_max, p_preferred_date, trim(p_delivery_location), project_id
  )
  on conflict on constraint custom_requests_client_token_unique do nothing
  returning r.id, r.reference;

  -- A concurrent duplicate lost the race: return the winner.
  if not found then
    return query select r.id, r.reference from public.custom_requests r
                  where r.customer_id = uid and r.client_token = p_client_token;
  end if;
end;
$$;

grant execute on function public.submit_custom_request(
  uuid, text, text, text, public.product_category, text, numeric, numeric, numeric,
  public.measurement_unit, text, text, text, integer, numeric, numeric, date, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- request_product_order: request a ready-made product.
-- Locks the product row, checks stock, reserves the units, and creates an
-- order awaiting owner confirmation. Price comes from the database.
-- ---------------------------------------------------------------------------
create function public.request_product_order(
  p_client_token uuid,
  p_product_id uuid,
  p_quantity integer,
  p_note text default null
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  prod record;
  existing record;
  new_order record;
  currency char(3);
begin
  if uid is null then
    raise exception 'Please sign in to request this item' using errcode = '42501';
  end if;
  if p_client_token is null then
    raise exception 'Missing submission token' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Choose a quantity between 1 and 100' using errcode = '22023';
  end if;

  select o.id, o.reference into existing from public.orders o
   where o.customer_id = uid and o.client_token = p_client_token;
  if found then
    return query select existing.id, existing.reference;
    return;
  end if;

  -- Abuse protection: at most 5 open unconfirmed requests per customer.
  if (select count(*) from public.orders o
       where o.customer_id = uid and o.status = 'pending_confirmation') >= 5 then
    raise exception 'You already have several requests awaiting confirmation. We will be in touch soon.'
      using errcode = 'P0001';
  end if;

  currency := public.business_currency();

  -- Row lock: concurrent requests for the same product queue here, so stock
  -- can't be oversold.
  select p.id, p.name, p.price_minor, p.stock_quantity into prod
    from public.products p
   where p.id = p_product_id and p.status = 'published'
   for update;
  if not found then
    raise exception 'This product is no longer available' using errcode = 'P0002';
  end if;
  if prod.stock_quantity < p_quantity then
    raise exception 'Only % left in stock', prod.stock_quantity using errcode = 'P0001';
  end if;

  update public.products p set stock_quantity = p.stock_quantity - p_quantity where p.id = prod.id;

  insert into public.orders as o (
    customer_id, source, status, currency_code, total_minor, customer_note, client_token, payment_instructions
  ) values (
    uid, 'ready_made', 'pending_confirmation', currency, prod.price_minor * p_quantity,
    nullif(left(trim(coalesce(p_note, '')), 1000), ''), p_client_token,
    (select s.payment_instructions from public.business_settings s where s.id)
  )
  returning o.id, o.reference into new_order;

  insert into public.order_items (order_id, product_id, description, quantity, unit_price_minor)
  values (new_order.id, prod.id, prod.name, p_quantity, prod.price_minor);

  return query select new_order.id, new_order.reference;
end;
$$;

grant execute on function public.request_product_order(uuid, uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- respond_to_quotation: the customer accepts or declines a sent quotation.
-- Acceptance creates exactly one confirmed order (unique constraints on
-- orders.quotation_id / request_id make duplicates impossible). Payment
-- status always starts as 'unpaid' and is only changed by the owner.
-- Returns the order id on acceptance, null on decline.
-- ---------------------------------------------------------------------------
create function public.respond_to_quotation(p_quotation_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  q record;
  req record;
  existing_order uuid;
  new_order_id uuid;
begin
  if uid is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;

  select * into q from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  select * into req from public.custom_requests where id = q.request_id for update;
  if req.customer_id <> uid then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  -- Repeated accept (double click, retry): return the existing order.
  if p_accept and q.status = 'accepted' then
    select id into existing_order from public.orders where quotation_id = q.id;
    return existing_order;
  end if;

  if q.status <> 'sent' then
    raise exception 'This quotation can no longer be answered (status: %)', q.status using errcode = 'P0001';
  end if;
  if q.valid_until is not null and q.valid_until < current_date then
    raise exception 'This quotation has expired. Please contact us for an updated one.' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.quotations set status = 'declined', responded_at = now() where id = q.id;
    -- Only mark the request declined if no other quotation is still open.
    if not exists (select 1 from public.quotations
                    where request_id = req.id and status = 'sent' and id <> q.id) then
      update public.custom_requests set status = 'declined' where id = req.id;
    end if;
    return null;
  end if;

  update public.quotations set status = 'accepted', responded_at = now() where id = q.id;
  update public.quotations set status = 'withdrawn'
   where request_id = req.id and id <> q.id and status in ('draft', 'sent');
  update public.custom_requests set status = 'accepted' where id = req.id;

  insert into public.orders (
    customer_id, source, request_id, quotation_id, status, payment_status, currency_code,
    total_minor, estimated_completion_date, payment_instructions, confirmed_at
  ) values (
    req.customer_id, 'custom', req.id, q.id, 'confirmed', 'unpaid', q.currency_code,
    q.total_minor, q.estimated_completion_date,
    coalesce(q.payment_terms, (select s.payment_instructions from public.business_settings s where s.id)),
    now()
  )
  returning id into new_order_id;

  insert into public.order_items (order_id, description, quantity, unit_price_minor)
  -- Fractional quantities (e.g. 2.5 hours) become one line priced at the line
  -- total, so order items always sum to the quotation total.
  select new_order_id, li.description,
         case when li.quantity = trunc(li.quantity) then li.quantity::integer else 1 end,
         case when li.quantity = trunc(li.quantity) then li.unit_price_minor else li.line_total_minor end
    from public.quotation_line_items li
   where li.quotation_id = q.id
   order by li.position;

  return new_order_id;
end;
$$;

grant execute on function public.respond_to_quotation(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- send_quotation (admin): freeze a draft quotation and show it to the customer.
-- ---------------------------------------------------------------------------
create function public.send_quotation(p_quotation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q record;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into q from public.quotations where id = p_quotation_id for update;
  if not found or q.status <> 'draft' then
    raise exception 'Only draft quotations can be sent' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.quotation_line_items where quotation_id = q.id) then
    raise exception 'Add at least one line item before sending' using errcode = 'P0001';
  end if;
  update public.quotations set status = 'sent', sent_at = now() where id = q.id;
  update public.custom_requests set status = 'quotation_sent'
   where id = q.request_id and status in ('submitted', 'under_review', 'quotation_sent', 'declined');
end;
$$;

grant execute on function public.send_quotation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_contact_inquiry: public contact form with abuse protection.
--   * honeypot field: bots that fill it get a silent success
--   * max 3 messages per email and 10 per IP per hour
-- ---------------------------------------------------------------------------
create function public.submit_contact_inquiry(
  p_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text,
  p_website text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  forwarded text;
  client_ip_hash text;
begin
  if coalesce(p_website, '') <> '' then
    return; -- honeypot triggered
  end if;

  begin
    forwarded := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
  exception when others then
    forwarded := null;
  end;
  if nullif(trim(forwarded), '') is not null then
    client_ip_hash := encode(extensions.digest(trim(forwarded), 'sha256'), 'hex');
  end if;

  if (select count(*) from public.contact_inquiries
       where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 3
     or (client_ip_hash is not null and (select count(*) from public.contact_inquiries
       where ip_hash = client_ip_hash and created_at > now() - interval '1 hour') >= 10) then
    raise exception 'Too many messages. Please wait a while before sending another.' using errcode = 'P0001';
  end if;

  insert into public.contact_inquiries (name, email, phone, subject, message, ip_hash)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_phone), ''), trim(p_subject), trim(p_message), client_ip_hash);
end;
$$;

grant execute on function public.submit_contact_inquiry(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- promote_to_admin: create the first administrator.
-- Not callable from the website. Run it in the Supabase SQL editor after the
-- owner has registered and confirmed their email:
--   select public.promote_to_admin('owner@example.com');
-- ---------------------------------------------------------------------------
create function public.promote_to_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select id into target from auth.users where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception 'No registered user with email %', p_email;
  end if;
  update public.profiles set role = 'admin' where id = target;
end;
$$;

revoke execute on function public.promote_to_admin(text) from public, anon, authenticated;
