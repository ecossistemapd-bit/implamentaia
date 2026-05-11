
-- Enums
CREATE TYPE public.solution_category AS ENUM ('ventas','marketing','atencion','finanzas','operaciones','rrhh');
CREATE TYPE public.solution_difficulty AS ENUM ('principiante','intermedio','avanzado');
CREATE TYPE public.builder_status AS ENUM ('generating','ready','error');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  role TEXT,
  industry TEXT,
  team_size TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- solutions (catálogo)
CREATE TABLE public.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category public.solution_category NOT NULL,
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  difficulty public.solution_difficulty NOT NULL,
  estimated_time TEXT NOT NULL,
  roi_estimate TEXT NOT NULL,
  tools_required TEXT[] NOT NULL DEFAULT '{}',
  icon_name TEXT NOT NULL DEFAULT 'Sparkles',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solutions_read_all" ON public.solutions FOR SELECT TO authenticated USING (true);

-- saved_solutions
CREATE TABLE public.saved_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, solution_id)
);
ALTER TABLE public.saved_solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_select_own" ON public.saved_solutions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "saved_insert_own" ON public.saved_solutions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_delete_own" ON public.saved_solutions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- builder_projects
CREATE TABLE public.builder_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nuevo proyecto',
  source_solution_id UUID REFERENCES public.solutions(id) ON DELETE SET NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  status public.builder_status NOT NULL DEFAULT 'generating',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.builder_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_own" ON public.builder_projects FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "projects_insert_own" ON public.builder_projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update_own" ON public.builder_projects FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "projects_delete_own" ON public.builder_projects FOR DELETE TO authenticated USING (user_id = auth.uid());

-- allowed_emails (privado)
CREATE TABLE public.allowed_emails (
  email TEXT PRIMARY KEY,
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
-- no policies = no access for users; service_role bypasses RLS

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.builder_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user: validate invite and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_lower TEXT := LOWER(NEW.email);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.allowed_emails WHERE LOWER(email) = email_lower) THEN
    RAISE EXCEPTION 'Esta plataforma es por invitación. Contáctanos para acceso.';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket: avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
