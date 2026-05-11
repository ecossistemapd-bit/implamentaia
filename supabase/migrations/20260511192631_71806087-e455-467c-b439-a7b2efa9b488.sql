
-- Add role check constraint to profiles (role column already exists)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'implementador', 'admin'));

-- Extend builder_status enum
ALTER TYPE builder_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE builder_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE builder_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add implementer fields to builder_projects
ALTER TABLE public.builder_projects ADD COLUMN IF NOT EXISTS implementador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.builder_projects ADD COLUMN IF NOT EXISTS status_note text;

-- Security definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_implementer_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('implementador', 'admin')
  )
$$;

-- Implementer RLS policies on builder_projects
DROP POLICY IF EXISTS "implementers can view assigned projects" ON public.builder_projects;
CREATE POLICY "implementers can view assigned projects"
  ON public.builder_projects FOR SELECT TO authenticated
  USING (
    auth.uid() = implementador_id
    OR auth.uid() = user_id
    OR public.is_implementer_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "implementers can update assigned projects" ON public.builder_projects;
CREATE POLICY "implementers can update assigned projects"
  ON public.builder_projects FOR UPDATE TO authenticated
  USING (
    auth.uid() = implementador_id
    OR auth.uid() = user_id
    OR public.is_implementer_or_admin(auth.uid())
  );
