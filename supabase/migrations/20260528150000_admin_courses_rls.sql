-- RLS policies para que los admins puedan CRUD courses, modules, lessons
-- desde el admin UI. SELECT sigue siendo authenticated (cualquier usuario logueado).

-- Helper: chequea si el user actual tiene role = 'admin' en profiles.
-- Como function por DRY y performance (se cachea por sesión).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- courses: admin puede INSERT/UPDATE/DELETE
drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write"
  on public.courses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- modules: admin puede INSERT/UPDATE/DELETE
drop policy if exists "modules_admin_write" on public.modules;
create policy "modules_admin_write"
  on public.modules for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- lessons: admin puede INSERT/UPDATE/DELETE
drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write"
  on public.lessons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket course-covers: admin puede INSERT/UPDATE/DELETE archivos.
-- (El SELECT authenticated ya estaba — sirve para signed URLs.)
drop policy if exists "course_covers_admin_write" on storage.objects;
create policy "course_covers_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'course-covers' and public.is_admin())
  with check (bucket_id = 'course-covers' and public.is_admin());
