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
