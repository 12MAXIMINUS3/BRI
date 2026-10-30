-- =============================================================================
-- Brand media edited from the admin dashboard: the logo and the background
-- video behind page headers. Stored in their own public bucket because videos
-- are larger than catalogue photos. Rows in site_photos with keys 'brand/logo'
-- and 'brand/header-video' point to files here; deleting a row restores the
-- built-in logo / video.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-media', 'site-media', true, 52428800,
   array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone reads site media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-media');

create policy "Admins upload site media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and (select public.is_admin()));

create policy "Admins update site media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and (select public.is_admin()))
  with check (bucket_id = 'site-media' and (select public.is_admin()));

create policy "Admins delete site media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and (select public.is_admin()));
