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
