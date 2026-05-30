-- Perfil: agrega campos extra a profiles + bucket privado de avatars con RLS
-- por usuario (cada uno solo accede a su propio path "{user_id}/...").

-- 1) Columnas nuevas en profiles
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role_title text,
  add column if not exists website text;

-- 2) Bucket avatars (privado, signed URLs)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- 3) Policies en storage.objects para el bucket avatars
-- SELECT: el usuario puede leer cualquier avatar (para que se vean en perfiles
-- públicos / sidebar / comentarios). Igual signed-url-only.
drop policy if exists "avatars_authenticated_read" on storage.objects;
create policy "avatars_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

-- INSERT/UPDATE/DELETE: solo en su propio path {auth.uid()}/...
drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
