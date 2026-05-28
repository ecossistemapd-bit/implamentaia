-- Capacitación: agregar tabla `lessons` para el modelo de 2 niveles (módulos → aulas).
-- Migración soft: dejamos las columnas legacy en `modules` y `user_progress` para que
-- el código actual siga funcionando hasta que migremos la página de detalle.

-- 1. Tabla lessons (= "aulas" en VDI).
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  duration_seconds integer,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lessons_module_id_idx on public.lessons (module_id);
create index if not exists lessons_order_idx on public.lessons (module_id, order_index);

alter table public.lessons enable row level security;

drop policy if exists "lessons_select_authenticated" on public.lessons;
create policy "lessons_select_authenticated"
  on public.lessons for select to authenticated using (true);

-- 2. user_progress: agregar lesson_id sin tocar module_id (soft-migration).
alter table public.user_progress
  add column if not exists lesson_id uuid references public.lessons(id) on delete cascade;

-- Permitir module_id nullable mientras dura la transición.
alter table public.user_progress
  alter column module_id drop not null;

-- Unique parcial sobre (user_id, lesson_id) — no choca con el unique existente sobre module_id.
create unique index if not exists user_progress_user_lesson_unique
  on public.user_progress (user_id, lesson_id)
  where lesson_id is not null;
