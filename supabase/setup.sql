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
-- =============================================================================
-- Row Level Security and privileges
--
-- Rules:
--   * Public visitors (anon) read only published catalogue content and settings.
--   * Customers read only their own requests, non-draft quotations, orders,
--     attachments, and status history. They never update prices, totals,
--     payment states, or production statuses (no UPDATE policies exist for them).
--   * Writes by customers go through SECURITY DEFINER functions (next migration),
--     except uploading attachment rows for their own requests.
--   * Admins manage everything. Internal notes are admin-only.
-- =============================================================================

alter table public.profiles             enable row level security;
alter table public.business_settings    enable row level security;
alter table public.portfolio_projects   enable row level security;
alter table public.portfolio_images     enable row level security;
alter table public.products             enable row level security;
alter table public.product_images       enable row level security;
alter table public.custom_requests      enable row level security;
alter table public.request_attachments  enable row level security;
alter table public.quotations           enable row level security;
alter table public.quotation_line_items enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.status_history       enable row level security;
alter table public.admin_notes          enable row level security;
alter table public.contact_inquiries    enable row level security;

-- ---------------------------------------------------------------------------
-- Baseline privileges. Supabase grants broad table privileges to anon and
-- authenticated by default; narrow them so RLS is not the only safeguard.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.business_settings, public.portfolio_projects, public.portfolio_images,
                public.products, public.product_images
  to anon, authenticated;

grant select on public.profiles, public.custom_requests, public.request_attachments, public.quotations,
                public.quotation_line_items, public.orders, public.order_items, public.status_history
  to authenticated;

-- Customers may edit only their own name and phone, never their role.
grant update (full_name, phone) on public.profiles to authenticated;
-- Customers may record attachments for their own requests (checked by RLS).
grant insert on public.request_attachments to authenticated;

-- Admin management. RLS below restricts these to admins.
grant insert, update, delete on public.business_settings, public.portfolio_projects, public.portfolio_images,
                                public.products, public.product_images, public.quotations,
                                public.quotation_line_items, public.admin_notes
  to authenticated;
grant update on public.custom_requests, public.orders, public.contact_inquiries to authenticated;
grant select on public.admin_notes, public.contact_inquiries to authenticated;
grant delete on public.request_attachments, public.contact_inquiries to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy "Users read their own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Business settings
-- ---------------------------------------------------------------------------
create policy "Anyone reads business settings"
  on public.business_settings for select to anon, authenticated
  using (true);

create policy "Admins update business settings"
  on public.business_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Catalogue: portfolio and products
-- ---------------------------------------------------------------------------
create policy "Public reads published projects; admins read all"
  on public.portfolio_projects for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));

create policy "Admins insert projects" on public.portfolio_projects for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update projects" on public.portfolio_projects for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete projects" on public.portfolio_projects for delete to authenticated
  using ((select public.is_admin()));

create policy "Public reads images of published projects"
  on public.portfolio_images for select to anon, authenticated
  using (
    exists (select 1 from public.portfolio_projects p
            where p.id = project_id and (p.status = 'published' or (select public.is_admin())))
  );

create policy "Admins insert project images" on public.portfolio_images for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update project images" on public.portfolio_images for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete project images" on public.portfolio_images for delete to authenticated
  using ((select public.is_admin()));

create policy "Public reads published products; admins read all"
  on public.products for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));

create policy "Admins insert products" on public.products for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update products" on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete products" on public.products for delete to authenticated
  using ((select public.is_admin()));

create policy "Public reads images of published products"
  on public.product_images for select to anon, authenticated
  using (
    exists (select 1 from public.products p
            where p.id = product_id and (p.status = 'published' or (select public.is_admin())))
  );

create policy "Admins insert product images" on public.product_images for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update product images" on public.product_images for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete product images" on public.product_images for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Custom requests and attachments
-- ---------------------------------------------------------------------------
create policy "Customers read own requests; admins read all"
  on public.custom_requests for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins update requests"
  on public.custom_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Customers read own attachments; admins read all"
  on public.request_attachments for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.custom_requests r
               where r.id = request_id and r.customer_id = (select auth.uid()))
  );

-- Customers can attach files only to their own requests that are still open,
-- and only using their own storage folder for that request.
create policy "Customers add attachments to own open requests"
  on public.request_attachments for insert to authenticated
  with check (
    exists (select 1 from public.custom_requests r
            where r.id = request_id
              and r.customer_id = (select auth.uid())
              and r.status in ('submitted', 'under_review'))
    and storage_path like ((select auth.uid())::text || '/' || request_id::text || '/%')
  );

-- The 5-file limit is a trigger rather than part of the policy: a policy that
-- queries its own table recurses.
create function public.limit_request_attachments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.request_id::text));
  if (select count(*) from public.request_attachments where request_id = new.request_id) >= 5 then
    raise exception 'A request can have at most 5 reference images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger request_attachments_limit before insert on public.request_attachments
  for each row execute function public.limit_request_attachments();

create policy "Admins delete attachments"
  on public.request_attachments for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Quotations (customers never see drafts)
-- ---------------------------------------------------------------------------
create policy "Customers read own sent quotations; admins read all"
  on public.quotations for select to authenticated
  using (
    (select public.is_admin())
    or (status <> 'draft' and exists (
          select 1 from public.custom_requests r
          where r.id = request_id and r.customer_id = (select auth.uid())))
  );

create policy "Admins insert quotations" on public.quotations for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update quotations" on public.quotations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete draft quotations" on public.quotations for delete to authenticated
  using ((select public.is_admin()) and status = 'draft');

create policy "Customers read line items of own sent quotations; admins read all"
  on public.quotation_line_items for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.quotations q
      join public.custom_requests r on r.id = q.request_id
      where q.id = quotation_id and q.status <> 'draft' and r.customer_id = (select auth.uid()))
  );

create policy "Admins insert line items" on public.quotation_line_items for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update line items" on public.quotation_line_items for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete line items" on public.quotation_line_items for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create policy "Customers read own orders; admins read all"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins update orders"
  on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Customers read own order items; admins read all"
  on public.order_items for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Status history
-- ---------------------------------------------------------------------------
create policy "Customers read history of own records; admins read all"
  on public.status_history for select to authenticated
  using (
    (select public.is_admin())
    or (entity_type = 'custom_request' and exists (
          select 1 from public.custom_requests r where r.id = entity_id and r.customer_id = (select auth.uid())))
    or (entity_type = 'order' and exists (
          select 1 from public.orders o where o.id = entity_id and o.customer_id = (select auth.uid())))
    or (entity_type = 'quotation' and exists (
          select 1 from public.quotations q join public.custom_requests r on r.id = q.request_id
          where q.id = entity_id and q.status <> 'draft' and r.customer_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- Admin-only tables
-- ---------------------------------------------------------------------------
create policy "Admins manage notes" on public.admin_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins read inquiries" on public.contact_inquiries for select to authenticated
  using ((select public.is_admin()));
create policy "Admins update inquiries" on public.contact_inquiries for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete inquiries" on public.contact_inquiries for delete to authenticated
  using ((select public.is_admin()));
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
-- =============================================================================
-- Storage
--   catalog-images        public  portfolio and product photos (admins upload)
--   request-attachments   private customer reference images
-- File type and size limits are enforced by the buckets themselves.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-images', 'catalog-images', true, 8388608,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('request-attachments', 'request-attachments', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public catalogue images ------------------------------------------------------
create policy "Anyone reads catalog images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'catalog-images');

create policy "Admins upload catalog images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog-images' and (select public.is_admin()));

create policy "Admins update catalog images"
  on storage.objects for update to authenticated
  using (bucket_id = 'catalog-images' and (select public.is_admin()))
  with check (bucket_id = 'catalog-images' and (select public.is_admin()));

create policy "Admins delete catalog images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'catalog-images' and (select public.is_admin()));

-- Private request attachments --------------------------------------------------
-- Path layout: {customer_id}/{request_id}/{random-file-name}
create policy "Customers upload attachments to own open requests"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'request-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.custom_requests r
      where r.id::text = (storage.foldername(name))[2]
        and r.customer_id = (select auth.uid())
        and r.status in ('submitted', 'under_review')
    )
  );

create policy "Customers read own attachments; admins read all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'request-attachments'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "Admins delete request attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'request-attachments' and (select public.is_admin()));
-- =============================================================================
-- DEMO CONTENT
-- Sample portfolio projects and products so the site isn't empty. Every row
-- is marked is_demo = true and labelled "Demo" on the site. They are NOT real
-- work by the business. Remove them once real content is added:
--   delete from public.portfolio_projects where is_demo;
--   delete from public.products where is_demo;
-- Prices are placeholder minor units (32000 = 320.00 in the configured currency).
-- =============================================================================

with projects (slug, title, category, summary, description, materials, finishes, dimensions, featured, sort_order) as (
  values
  ('walnut-dining-table', 'Walnut dining table', 'tables'::public.product_category,
   'A solid walnut table with a softened edge profile and tapered legs, seating eight.',
   E'A long dining table in solid walnut, sized for eight. The top is edge-jointed from wide boards with the grain matched across the joints, and the edges are eased so they are comfortable to lean on.\n\nTapered legs are joined to the apron with mortise-and-tenon joints, and the top is fixed with buttons so it can move with seasonal changes in humidity.',
   array['Solid walnut'], array['Hardwax oil'], 'W 2200 × D 950 × H 750 mm', true, 1),
  ('oak-alcove-shelving', 'Oak alcove shelving', 'cabinetry',
   'Fitted shelves and low cupboards built to the exact shape of a pair of alcoves.',
   E'Built-in shelving for two alcoves either side of a fireplace. Each unit was scribed to the uneven walls so it sits tight without visible gaps.\n\nLow cupboards with flush doors sit beneath adjustable shelves, with concealed hinges and push-to-open catches.',
   array['Oak veneered board', 'Solid oak edging and face frames'], array['Clear lacquer, matte'],
   'Two units, each approx. W 1050 × D 380 × H 2400 mm', true, 2),
  ('ash-lounge-chair', 'Ash lounge chair', 'seating',
   'A low lounge chair in steam-bent ash with a woven seat.',
   'A relaxed lounge chair with a gently reclined back. The back rails are steam-bent ash, and the seat is woven in natural cord.',
   array['Solid ash', 'Natural paper cord seat'], array['Natural oil'], 'W 700 × D 780 × H 720 mm, seat height 380 mm', true, 3),
  ('teak-garden-bench', 'Teak garden bench', 'outdoor',
   'A slatted bench for outdoor use, built with weather-resistant joinery.',
   'A three-seat garden bench in teak. Slats are spaced to shed water, and all fixings are stainless steel.',
   array['Teak', 'Stainless steel fixings'], array['Exterior oil'], 'W 1500 × D 560 × H 850 mm', false, 4),
  ('cherry-bed-frame', 'Cherry bed frame', 'beds',
   'A king-size bed frame with a slatted headboard and knock-down fittings.',
   'A king-size bed in solid cherry. It comes apart with bed bolts so it can be moved through narrow stairways.',
   array['Solid cherry'], array['Natural oil'], 'Fits a king-size mattress; headboard height 1050 mm', false, 5),
  ('maple-kitchen-island', 'Maple kitchen island', 'cabinetry',
   'A freestanding island with deep drawers and a thick end-grain work surface.',
   'A kitchen island with deep drawers on soft-close runners and an end-grain maple top for food preparation.',
   array['Hard maple', 'Birch plywood carcass'], array['Food-safe oil (top)', 'Clear lacquer, satin (base)'],
   'W 1600 × D 800 × H 910 mm', false, 6),
  ('oak-media-console', 'Oak media console', 'storage',
   'A low console with sliding doors and ventilated compartments for equipment.',
   'A long, low cabinet for a living room, with sliding doors, cable routing at the back, and ventilated compartments.',
   array['Solid oak', 'Oak veneered board'], array['Hardwax oil'], null, false, 7),
  ('walnut-serving-boards', 'Walnut serving boards', 'decor',
   'A set of serving boards cut from offcuts of a larger walnut commission.',
   'Serving boards in three sizes, each with a carved handle and a food-safe oil finish.',
   array['Walnut'], array['Food-safe oil'], 'Small, medium, and large; up to 600 mm long', false, 8)
)
insert into public.portfolio_projects
  (slug, title, category, summary, description, materials, finishes, dimensions, featured, sort_order,
   status, is_demo, published_at)
select slug, title, category, summary, description, materials, finishes, dimensions, featured, sort_order,
       'published', true, now()
from projects
on conflict (slug) do nothing;

-- Images are sample stock photos bundled with the site (paths starting with "/").
-- Replace them by uploading your own photos in the admin dashboard.
insert into public.portfolio_images (project_id, storage_path, alt, tone, position)
select p.id, i.storage_path, i.alt, i.tone::public.wood_tone, i.position
from (values
  ('walnut-dining-table', '/images/stock/dining-table-view-1400.webp', 'Wooden dining table by a window with a city view', 'walnut', 0),
  ('walnut-dining-table', '/images/stock/rustic-tabletop-1400.webp', 'Close-up of a solid wood tabletop', 'walnut', 1),
  ('walnut-dining-table', '/images/stock/dining-room-1400.webp', 'Dining room with a wooden table and chairs', 'cherry', 2),
  ('oak-alcove-shelving', '/images/stock/shelving-living-room-1400.webp', 'Living room with floor-to-ceiling shelving', 'oak', 0),
  ('oak-alcove-shelving', '/images/stock/library-shelves-1400.webp', 'Wooden bookshelves in a reading room', 'oak', 1),
  ('ash-lounge-chair', '/images/stock/armchair-1400.webp', 'Wooden armchair with a cushion by a window', 'ash', 0),
  ('ash-lounge-chair', '/images/stock/minimal-living-room-1400.webp', 'Cosy living room with a sofa', 'maple', 1),
  ('teak-garden-bench', '/images/stock/outdoor-table-1400.webp', 'Wooden outdoor table with stools', 'teak', 0),
  ('cherry-bed-frame', '/images/stock/bedroom-1400.webp', 'Bright bedroom with a desk', 'cherry', 0),
  ('cherry-bed-frame', '/images/stock/breakfast-tray-1400.webp', 'Breakfast served on a wooden tray', 'cherry', 1),
  ('maple-kitchen-island', '/images/stock/kitchen-1400.webp', 'Kitchen with an island and pendant lights', 'maple', 0),
  ('maple-kitchen-island', '/images/stock/kitchen-drawer-1400.webp', 'Wooden drawer organiser holding cutlery', 'maple', 1),
  ('oak-media-console', '/images/stock/wood-panelled-room-1400.webp', 'Wood-panelled wall with a low cabinet', 'oak', 0),
  ('walnut-serving-boards', '/images/stock/cutting-board-herbs-1400.webp', 'Wooden board with herbs and spices', 'walnut', 0)
) as i (slug, storage_path, alt, tone, position)
join public.portfolio_projects p on p.slug = i.slug and p.is_demo
where not exists (select 1 from public.portfolio_images x where x.project_id = p.id);

with items (slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions, featured, sort_order, alt, storage_path, tone) as (
  values
  ('oak-side-table', 'Oak side table', 'tables'::public.product_category,
   'A compact side table with a lower shelf, sized for beside a sofa or bed.',
   'A small side table in solid oak with a lower shelf. The top has a slight chamfer on the underside so it looks lighter than its thickness.',
   32000, 4, array['Solid oak'], 'Hardwax oil', 'W 450 × D 450 × H 550 mm', true, 1, 'Round side table beside an armchair', '/images/stock/side-table-1400.webp', 'oak'),
  ('walnut-wall-shelf', 'Walnut wall shelf', 'storage',
   'A floating shelf with a concealed bracket, cut from a single board.',
   'A single-board walnut shelf with a hidden steel bracket. Wall fixings suitable for masonry are included.',
   14500, 2, array['Solid walnut', 'Steel bracket'], 'Natural oil', 'W 900 × D 220 × H 40 mm', true, 2, 'Wooden shelf with potted plants', '/images/stock/wall-shelf-plants-1400.webp', 'walnut'),
  ('ash-step-stool', 'Ash step stool', 'seating',
   'A sturdy two-step stool that doubles as a plant stand or bedside perch.',
   'A two-step stool with through-tenoned steps and a hand hole for carrying.',
   18000, 0, array['Solid ash'], 'Clear lacquer, matte', 'W 420 × D 380 × H 450 mm', true, 3, 'Wooden table and benches in sunlight', '/images/stock/benches-1400.webp', 'ash'),
  ('cherry-serving-tray', 'Cherry serving tray', 'decor',
   'A shallow tray with carved handles and a food-safe finish.',
   'A shallow serving tray with carved handles. Wipe clean; not dishwasher safe.',
   6500, 9, array['Solid cherry'], 'Food-safe oil', 'W 500 × D 300 × H 50 mm', false, 4, 'Woven tray on a dining table', '/images/stock/tray-table-1400.webp', 'cherry'),
  ('oak-coat-rack', 'Oak coat rack', 'storage',
   'A wall-mounted rack with five turned pegs.',
   'A wall-mounted rack with five turned oak pegs set into a solid backboard.',
   9500, 6, array['Solid oak'], 'Hardwax oil', 'W 800 × D 90 × H 120 mm', false, 5, 'Hallway with a wooden floor and shelving', '/images/stock/hallway-1400.webp', 'oak'),
  ('teak-planter-box', 'Teak planter box', 'outdoor',
   'A planter box with a removable liner and raised feet for drainage.',
   'An outdoor planter in teak with a removable liner and raised feet so water can drain freely.',
   21000, 3, array['Teak'], 'Exterior oil', 'W 600 × D 300 × H 350 mm', false, 6, 'Plants in terracotta pots', '/images/stock/terracotta-planters-1400.webp', 'teak'),
  ('maple-cutting-board', 'Maple cutting board', 'decor',
   'An end-grain board that is gentle on knife edges.',
   'An end-grain cutting board in hard maple with rubber feet.',
   8500, 1, array['Hard maple'], 'Food-safe oil', 'W 450 × D 300 × H 40 mm', false, 7, 'End-grain wood blocks', '/images/stock/end-grain-1400.webp', 'maple')
),
inserted as (
  insert into public.products
    (slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions,
     featured, sort_order, status, is_demo)
  select slug, name, category, summary, description, price_minor, stock_quantity, materials, finish, dimensions,
         featured, sort_order, 'published', true
  from items
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_images (product_id, storage_path, alt, tone, position)
select ins.id, items.storage_path, items.alt, items.tone::public.wood_tone, 0
from inserted ins join items on items.slug = ins.slug;
-- =============================================================================
-- Profile email
-- Copies each user's sign-in email onto their profile so the owner can contact
-- customers from the admin dashboard (auth.users is not readable from the
-- browser). Kept in sync by triggers; customers cannot edit it directly.
-- =============================================================================

alter table public.profiles add column email text check (char_length(email) <= 254);

update public.profiles p set email = u.email from auth.users u where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    left(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 32),
    new.email
  );
  return new;
end;
$$;

create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.sync_profile_email();

create index profiles_email_idx on public.profiles (lower(email));
-- =============================================================================
-- Site photos edited from the admin dashboard
--
-- The website's own photos (home page, About, Categories) have built-in
-- defaults in src/config/images.ts. A row here replaces one of them: the key
-- names the slot (e.g. 'home/hero'), storage_path points to the uploaded file
-- in the public catalog-images bucket (or to a bundled "/images/..." file when
-- only the description was changed). Deleting the row restores the default.
-- =============================================================================

create table public.site_photos (
  key text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)+$' and char_length(key) <= 100),
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  alt text not null check (char_length(alt) between 1 and 300),
  updated_at timestamptz not null default now()
);

create trigger site_photos_updated_at before update on public.site_photos
  for each row execute function public.set_updated_at();

alter table public.site_photos enable row level security;

grant select on public.site_photos to anon, authenticated;
grant insert, update, delete on public.site_photos to authenticated;

create policy "Anyone reads site photos"
  on public.site_photos for select to anon, authenticated
  using (true);

create policy "Admins add site photos" on public.site_photos for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update site photos" on public.site_photos for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins remove site photos" on public.site_photos for delete to authenticated
  using ((select public.is_admin()));
