-- Add new enum value (must be in its own statement, no transaction)
ALTER TYPE public.builder_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.builder_status ADD VALUE IF NOT EXISTS 'completed';

-- Add columns for project type and link to builder session
ALTER TABLE public.builder_projects
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'diy',
  ADD COLUMN IF NOT EXISTS builder_session_id uuid REFERENCES public.builder_sessions(id) ON DELETE SET NULL;

-- Unique index for ON CONFLICT DO NOTHING when creating implementador projects from a session
CREATE UNIQUE INDEX IF NOT EXISTS builder_projects_user_session_type_unique
  ON public.builder_projects (user_id, builder_session_id, type)
  WHERE builder_session_id IS NOT NULL;
