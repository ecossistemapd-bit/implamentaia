CREATE TABLE public.builder_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  blueprint JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_blueprints TO authenticated;
GRANT ALL ON public.builder_blueprints TO service_role;
ALTER TABLE public.builder_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own blueprints" ON public.builder_blueprints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own blueprints" ON public.builder_blueprints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own blueprints" ON public.builder_blueprints FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX builder_blueprints_user_created_idx ON public.builder_blueprints (user_id, created_at DESC);