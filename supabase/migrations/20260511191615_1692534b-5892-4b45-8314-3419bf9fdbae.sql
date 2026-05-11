
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  category text,
  level text CHECK (level IN ('Principiante', 'Intermedio', 'Avanzado')),
  is_published boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_authenticated"
  ON public.courses FOR SELECT TO authenticated USING (true);

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  duration_minutes integer,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_select_authenticated"
  ON public.modules FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_progress_all_own"
  ON public.user_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.courses (title, description, category, level, order_index) VALUES
('Lovable: Construí tu producto digital con IA',
 'Aprendé a crear plataformas completas sin código usando Lovable. Desde el primer prompt hasta el deploy.',
 'No-Code', 'Principiante', 1),
('Claude: Tu co-piloto de IA para el negocio',
 'Dominá Claude para automatizar tareas, generar contenido, analizar datos y construir agentes de IA.',
 'Inteligencia Artificial', 'Principiante', 2),
('n8n: Automatizaciones sin límites',
 'Conectá todas tus herramientas con n8n. Workflows avanzados, integraciones con WhatsApp, CRMs y más.',
 'Automatización', 'Intermedio', 3);
