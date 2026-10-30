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
