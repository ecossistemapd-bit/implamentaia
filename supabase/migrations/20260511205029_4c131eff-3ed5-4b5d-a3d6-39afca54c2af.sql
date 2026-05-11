CREATE TABLE public.solution_steps_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.solutions ON DELETE CASCADE,
  step text NOT NULL CHECK (step IN ('herramientas','archivos','video','comentarios','conclusion')),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE(user_id, solution_id, step)
);
ALTER TABLE public.solution_steps_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own step progress"
  ON public.solution_steps_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.solution_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.solutions ON DELETE CASCADE,
  rating integer CHECK (rating >= 0 AND rating <= 10),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.solution_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments viewable by authenticated users"
  ON public.solution_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own comments"
  ON public.solution_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own comments"
  ON public.solution_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.solutions ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.solutions ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '[]'::jsonb;