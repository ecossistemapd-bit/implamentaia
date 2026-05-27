-- Privatizar el bucket course-covers: sacar la policy de SELECT público.
-- Las imágenes solo se sirven vía signed URLs generadas por el cliente autenticado.

drop policy if exists "course_covers_public_read" on storage.objects;

-- Marcar el bucket como NO público (a nivel de bucket también).
update storage.buckets set public = false where id = 'course-covers';

-- Policy nueva: solo usuarios autenticados pueden generar signed URLs (SELECT).
-- El cliente firma con el JWT del usuario logueado.
create policy "course_covers_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'course-covers');
