-- Implementa AI · Builder Fase 2a
-- Tabla para persistir los blueprints generados por el Builder (idea + answers + output).
-- Habilita el "Histórico" del Builder más adelante.

CREATE TABLE public.builder_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  blueprint JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blueprints_select_own" ON public.builder_blueprints
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "blueprints_insert_own" ON public.builder_blueprints
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "blueprints_delete_own" ON public.builder_blueprints
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_builder_blueprints_user_created
  ON public.builder_blueprints (user_id, created_at DESC);
