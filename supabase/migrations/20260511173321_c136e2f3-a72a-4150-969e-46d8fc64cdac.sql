
ALTER TABLE public.solutions
  ADD COLUMN IF NOT EXISTS builder_questions jsonb,
  ADD COLUMN IF NOT EXISTS n8n_template text,
  ADD COLUMN IF NOT EXISTS checklist_items text[];

CREATE TABLE IF NOT EXISTS public.builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  solution_id uuid NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_prompt text,
  generated_n8n text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own" ON public.builder_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.builder_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.builder_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON public.builder_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_builder_sessions_updated_at
  BEFORE UPDATE ON public.builder_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
