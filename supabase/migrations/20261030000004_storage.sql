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
