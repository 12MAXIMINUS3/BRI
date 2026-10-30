-- =============================================================================
-- BuiltRight Interiors: core schema
--
-- Status fields are deliberately separate:
--   custom_requests.status   request workflow   (submitted → under_review → quotation_sent → accepted / declined)
--   quotations.status        quotation workflow (draft → sent → accepted / declined / withdrawn / expired)
--   orders.status            production         (pending_confirmation → confirmed → in_production → ready → completed, or cancelled)
--   orders.payment_status    payment, managed only by the owner (never set by quotation acceptance)
--
-- Money is stored as integer minor units (e.g. cents) in *_minor columns.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'admin');
create type public.product_category as enum
  ('tables', 'seating', 'storage', 'cabinetry', 'beds', 'outdoor', 'decor', 'other',
   'shop-design', 'pop-wood-design');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.request_status as enum
  ('submitted', 'under_review', 'quotation_sent', 'accepted', 'declined', 'cancelled');
create type public.quotation_status as enum ('draft', 'sent', 'accepted', 'declined', 'withdrawn', 'expired');
create type public.order_source as enum ('custom', 'ready_made');
create type public.order_status as enum
  ('pending_confirmation', 'confirmed', 'in_production', 'ready', 'completed', 'cancelled');
create type public.payment_status as enum ('unpaid', 'deposit_paid', 'paid', 'refunded');
create type public.inquiry_status as enum ('new', 'in_progress', 'closed', 'spam');
create type public.measurement_unit as enum ('mm', 'cm', 'm', 'in', 'ft');
create type public.wood_tone as enum ('oak', 'walnut', 'ash', 'cherry', 'teak', 'maple');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- True when the current user is an administrator. SECURITY DEFINER so it can
-- be used inside RLS policies without recursive policy checks.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Every new auth user gets a customer profile. The role is never read from
-- user-supplied metadata, so nobody can sign up as an admin.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    left(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 32)
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Defence in depth: only the database owner (SQL editor / migrations) can
-- change a role, even if a policy or grant is later loosened by mistake.
create function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user in ('authenticated', 'anon') then
    raise exception 'Changing roles is not allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Business settings (single row)
-- ---------------------------------------------------------------------------
create table public.business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'BuiltRight Interiors' check (char_length(business_name) between 1 and 120),
  tagline text check (char_length(tagline) <= 200),
  contact_email text check (char_length(contact_email) <= 254),
  contact_phone text check (char_length(contact_phone) <= 32),
  whatsapp_number text check (whatsapp_number ~ '^[0-9]{6,20}$'),
  location text check (char_length(location) <= 200),
  service_area text check (char_length(service_area) <= 200),
  currency_code char(3) check (currency_code ~ '^[A-Z]{3}$'),
  locale text check (char_length(locale) <= 20),
  -- Copied onto each order when it is created, so later edits don't rewrite history.
  payment_instructions text check (char_length(payment_instructions) <= 4000),
  updated_at timestamptz not null default now()
);

create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

insert into public.business_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Portfolio
-- ---------------------------------------------------------------------------
create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 1 and 160),
  category public.product_category not null,
  summary text not null default '' check (char_length(summary) <= 400),
  -- Paragraphs separated by a blank line.
  description text not null default '' check (char_length(description) <= 10000),
  materials text[] not null default '{}',
  finishes text[] not null default '{}',
  dimensions text check (char_length(dimensions) <= 200),
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.publish_status not null default 'draft',
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_projects_public_idx on public.portfolio_projects (status, category, sort_order);
create trigger portfolio_projects_updated_at before update on public.portfolio_projects
  for each row execute function public.set_updated_at();

create table public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.portfolio_projects (id) on delete cascade,
  -- Path inside the public `catalog-images` bucket. Null = placeholder (demo content).
  storage_path text check (char_length(storage_path) between 1 and 500),
  alt text not null check (char_length(alt) between 1 and 300),
  width integer check (width > 0),
  height integer check (height > 0),
  tone public.wood_tone not null default 'oak',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_images_project_idx on public.portfolio_images (project_id, position);

-- ---------------------------------------------------------------------------
-- Ready-made products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  name text not null check (char_length(name) between 1 and 160),
  category public.product_category not null,
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 10000),
  price_minor bigint not null check (price_minor >= 0),
  -- Units available to request. Reserved when a customer requests an item,
  -- released if that order is cancelled. Can never go negative.
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  materials text[] not null default '{}',
  finish text check (char_length(finish) <= 200),
  dimensions text check (char_length(dimensions) <= 200),
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.publish_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_public_idx on public.products (status, category, sort_order);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text check (char_length(storage_path) between 1 and 500),
  alt text not null check (char_length(alt) between 1 and 300),
  width integer check (width > 0),
  height integer check (height > 0),
  tone public.wood_tone not null default 'oak',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------------------
-- Custom-order requests
-- ---------------------------------------------------------------------------
create sequence public.custom_request_reference_seq;

create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('CR-' || lpad(nextval('public.custom_request_reference_seq')::text, 5, '0')),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  -- Contact details as given on the form (may differ from the profile).
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text not null check (phone ~ '^\+?[0-9\s().-]{6,32}$'),
  category public.product_category not null,
  description text not null check (char_length(description) between 20 and 5000),
  width numeric(10, 2) check (width > 0),
  depth numeric(10, 2) check (depth > 0),
  height numeric(10, 2) check (height > 0),
  unit public.measurement_unit not null default 'cm',
  dimension_notes text check (char_length(dimension_notes) <= 500),
  material text not null check (char_length(material) between 1 and 100),
  finish text not null check (char_length(finish) between 1 and 100),
  quantity integer not null check (quantity between 1 and 500),
  -- Non-binding budget range in major units of the business currency.
  budget_min numeric(14, 2) check (budget_min > 0),
  budget_max numeric(14, 2) check (budget_max > 0),
  preferred_date date,
  delivery_location text not null check (char_length(delivery_location) between 2 and 300),
  reference_project_id uuid references public.portfolio_projects (id) on delete set null,
  status public.request_status not null default 'submitted',
  -- Idempotency key from the browser: retries of the same submission return
  -- the original request instead of creating a duplicate.
  client_token uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_requests_budget_range check (budget_max is null or budget_min is null or budget_max >= budget_min),
  constraint custom_requests_client_token_unique unique (customer_id, client_token)
);

create index custom_requests_customer_idx on public.custom_requests (customer_id, created_at desc);
create index custom_requests_status_idx on public.custom_requests (status, created_at desc);
create trigger custom_requests_updated_at before update on public.custom_requests
  for each row execute function public.set_updated_at();

create table public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_requests (id) on delete cascade,
  -- Path inside the private `request-attachments` bucket: {customer_id}/{request_id}/{file}
  storage_path text not null unique check (char_length(storage_path) <= 500),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create index request_attachments_request_idx on public.request_attachments (request_id);

-- ---------------------------------------------------------------------------
-- Quotations
-- ---------------------------------------------------------------------------
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_requests (id) on delete cascade,
  version integer not null default 1 check (version >= 1),
  status public.quotation_status not null default 'draft',
  scope text not null default '' check (char_length(scope) <= 10000),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  -- Maintained from line items by trigger; never written by clients.
  total_minor bigint not null default 0 check (total_minor >= 0),
  estimated_timeframe text check (char_length(estimated_timeframe) <= 200),
  estimated_completion_date date,
  payment_terms text check (char_length(payment_terms) <= 4000),
  valid_until date,
  sent_at timestamptz,
  responded_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_version_unique unique (request_id, version)
);

-- At most one accepted quotation per request.
create unique index quotations_one_accepted_idx on public.quotations (request_id) where status = 'accepted';
create index quotations_request_idx on public.quotations (request_id, version desc);
create trigger quotations_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 500),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_total_minor bigint generated always as (round(quantity * unit_price_minor)::bigint) stored,
  position integer not null default 0
);

create index quotation_line_items_quotation_idx on public.quotation_line_items (quotation_id, position);

create function public.recalculate_quotation_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.quotation_id, old.quotation_id);
begin
  update public.quotations q
     set total_minor = coalesce((select sum(li.line_total_minor) from public.quotation_line_items li
                                 where li.quotation_id = target), 0)
   where q.id = target;
  return null;
end;
$$;

create trigger quotation_line_items_total
  after insert or update or delete on public.quotation_line_items
  for each row execute function public.recalculate_quotation_total();

-- Only draft quotations can be edited. Once sent, the customer must see
-- exactly what they are accepting.
create function public.lock_sent_quotation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  q_status public.quotation_status;
begin
  if tg_table_name = 'quotation_line_items' then
    select status into q_status from public.quotations
     where id = coalesce(new.quotation_id, old.quotation_id);
    if q_status is not null and q_status <> 'draft' then
      raise exception 'Line items can only be changed while the quotation is a draft' using errcode = '42501';
    end if;
    return coalesce(new, old);
  end if;

  -- quotations: content columns are frozen once the quotation leaves draft.
  if old.status <> 'draft' and (
       new.scope is distinct from old.scope
    or new.currency_code is distinct from old.currency_code
    or new.estimated_timeframe is distinct from old.estimated_timeframe
    or new.estimated_completion_date is distinct from old.estimated_completion_date
    or new.payment_terms is distinct from old.payment_terms
    or new.valid_until is distinct from old.valid_until
    or new.request_id is distinct from old.request_id
    or (new.total_minor is distinct from old.total_minor)
  ) then
    raise exception 'A sent quotation cannot be edited. Create a new version instead.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger quotations_lock_sent before update on public.quotations
  for each row execute function public.lock_sent_quotation();
create trigger quotation_line_items_lock_sent
  before insert or update or delete on public.quotation_line_items
  for each row execute function public.lock_sent_quotation();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.order_reference_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('OR-' || lpad(nextval('public.order_reference_seq')::text, 5, '0')),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  source public.order_source not null,
  -- Unique: a request / quotation can only ever produce one order.
  request_id uuid unique references public.custom_requests (id) on delete restrict,
  quotation_id uuid unique references public.quotations (id) on delete restrict,
  status public.order_status not null,
  payment_status public.payment_status not null default 'unpaid',
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  total_minor bigint not null check (total_minor >= 0),
  estimated_completion_date date,
  payment_instructions text check (char_length(payment_instructions) <= 4000),
  customer_note text check (char_length(customer_note) <= 1000),
  cancellation_reason text check (char_length(cancellation_reason) <= 1000),
  client_token uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_source_links check (
    (source = 'custom' and request_id is not null and quotation_id is not null)
    or (source = 'ready_made' and request_id is null and quotation_id is null)
  ),
  constraint orders_client_token_unique unique (customer_id, client_token)
);

create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null check (char_length(description) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_total_minor bigint generated always as (quantity * unit_price_minor) stored
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- Allowed production transitions. Cancelling a ready-made order returns its
-- reserved stock. Payment status is independent and only the owner changes it.
create function public.enforce_order_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending_confirmation' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed'            and new.status in ('in_production', 'ready', 'cancelled'))
      or (old.status = 'in_production'        and new.status in ('ready', 'cancelled'))
      or (old.status = 'ready'                and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Order cannot move from % to %', old.status, new.status using errcode = '22023';
    end if;

    if new.status = 'confirmed' then
      new.confirmed_at := coalesce(new.confirmed_at, now());
    end if;

    if new.status = 'cancelled' and old.source = 'ready_made' then
      update public.products p
         set stock_quantity = p.stock_quantity + oi.quantity
        from public.order_items oi
       where oi.order_id = old.id and oi.product_id = p.id;
    end if;
  end if;

  if new.total_minor is distinct from old.total_minor
     or new.currency_code is distinct from old.currency_code
     or new.customer_id is distinct from old.customer_id
     or new.source is distinct from old.source then
    raise exception 'Order totals and ownership cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger orders_enforce_transition before update on public.orders
  for each row execute function public.enforce_order_transition();

-- ---------------------------------------------------------------------------
-- Status history (written by triggers only)
-- ---------------------------------------------------------------------------
create table public.status_history (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('custom_request', 'quotation', 'order')),
  entity_id uuid not null,
  field text not null check (field in ('status', 'payment_status')),
  from_value text,
  to_value text not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index status_history_entity_idx on public.status_history (entity_type, entity_id, created_at);

create function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind text := case tg_table_name
    when 'custom_requests' then 'custom_request'
    when 'quotations' then 'quotation'
    else 'order'
  end;
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (entity_type, entity_id, field, from_value, to_value, changed_by)
    values (kind, new.id, 'status', null, new.status::text, (select auth.uid()));
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.status_history (entity_type, entity_id, field, from_value, to_value, changed_by)
    values (kind, new.id, 'status', old.status::text, new.status::text, (select auth.uid()));
  end if;

  -- Nested IF: PL/pgSQL doesn't short-circuit, and only orders have payment_status.
  if tg_table_name = 'orders' then
    if new.payment_status is distinct from old.payment_status then
      insert into public.status_history (entity_type, entity_id, field, from_value, to_value, changed_by)
      values (kind, new.id, 'payment_status', old.payment_status::text, new.payment_status::text, (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;

create trigger custom_requests_history after insert or update on public.custom_requests
  for each row execute function public.log_status_change();
create trigger quotations_history after insert or update on public.quotations
  for each row execute function public.log_status_change();
create trigger orders_history after insert or update on public.orders
  for each row execute function public.log_status_change();

-- ---------------------------------------------------------------------------
-- Private admin notes
-- ---------------------------------------------------------------------------
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('custom_request', 'order', 'contact_inquiry')),
  entity_id uuid not null,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index admin_notes_entity_idx on public.admin_notes (entity_type, entity_id, created_at);

-- ---------------------------------------------------------------------------
-- Contact inquiries (inserted only through submit_contact_inquiry)
-- ---------------------------------------------------------------------------
create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  subject text not null check (char_length(subject) between 1 and 120),
  message text not null check (char_length(message) between 10 and 4000),
  status public.inquiry_status not null default 'new',
  -- SHA-256 of the client IP, used only for rate limiting.
  ip_hash text,
  created_at timestamptz not null default now()
);

create index contact_inquiries_status_idx on public.contact_inquiries (status, created_at desc);
create index contact_inquiries_rate_email_idx on public.contact_inquiries (lower(email), created_at);
create index contact_inquiries_rate_ip_idx on public.contact_inquiries (ip_hash, created_at);
