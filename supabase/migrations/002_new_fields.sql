-- =====================
-- Appeal Prop Type on properties
-- =====================
alter table properties
  add column if not exists appeal_prop_type text;

-- =====================
-- Verified flag on comps
-- =====================
alter table comps
  add column if not exists verified boolean default false;

-- =====================
-- Extended user_profiles fields
-- =====================
alter table user_profiles
  add column if not exists phone text,
  add column if not exists title text,
  add column if not exists bio text,
  add column if not exists avatar_url text;

-- =====================
-- Create avatars storage bucket (run once)
-- =====================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Storage policy: authenticated users can upload their own avatar
create policy if not exists "avatars_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' AND name = 'avatars/' || auth.uid() || '.' || (storage.extension(name)));

create policy if not exists "avatars_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' AND name like 'avatars/' || auth.uid() || '.%');

create policy if not exists "avatars_public_read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
