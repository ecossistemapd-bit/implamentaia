-- Capacitación: extender courses con campos para la sección Capacitación + bucket de portadas

alter table public.courses
  add column if not exists instructor_name text,
  add column if not exists format text,
  add column if not exists section_key text,
  add column if not exists student_count integer not null default 0,
  add column if not exists coming_soon boolean not null default false;

create index if not exists courses_section_key_idx on public.courses (section_key);

-- Bucket público para portadas de cursos
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

drop policy if exists "course_covers_public_read" on storage.objects;
create policy "course_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'course-covers');

-- Seed seguro: los 3 cursos existentes pasan a la sección Herramientas / formato Formación.
-- instructor_name queda NULL para que Gino lo complete cuando suba portadas reales.
update public.courses
  set section_key = coalesce(section_key, 'herramientas'),
      format = coalesce(format, 'Formación')
  where title ilike '%lovable%' or title ilike '%claude%' or title ilike '%n8n%';
