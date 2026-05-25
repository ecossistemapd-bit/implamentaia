-- ImplamentaIA · Asistente de Ventas (pre-venta)
-- Tabla para persistir los prospectos analizados por el asistente de ventas
-- y enviados al closer. Guarda los datos de la empresa, el análisis generado
-- por la IA, los documentos de contexto subidos y el estado de seguimiento.

CREATE TABLE public.sales_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  what_sells TEXT,
  notes TEXT,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'nuevo'
    CHECK (status IN ('nuevo', 'en_proceso', 'cerrado', 'descartado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_prospects ENABLE ROW LEVEL SECURITY;

-- El SDR (creador) ve los suyos; los admins (closers) ven todos.
CREATE POLICY "sales_prospects_select_own_or_admin" ON public.sales_prospects
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "sales_prospects_insert_own" ON public.sales_prospects
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- El creador puede editar los suyos; el admin/closer puede actualizar el estado de cualquiera.
CREATE POLICY "sales_prospects_update_own_or_admin" ON public.sales_prospects
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "sales_prospects_delete_own_or_admin" ON public.sales_prospects
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX idx_sales_prospects_user_created
  ON public.sales_prospects (user_id, created_at DESC);
CREATE INDEX idx_sales_prospects_status_created
  ON public.sales_prospects (status, created_at DESC);

CREATE TRIGGER sales_prospects_set_updated_at
  BEFORE UPDATE ON public.sales_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- Storage: bucket privado para los documentos de contexto que el
-- SDR sube (casos previos, material de la empresa, etc.). Los
-- archivos se guardan en carpetas por usuario: {user_id}/...
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-docs', 'sales-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "sales_docs_read_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sales-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
  );

CREATE POLICY "sales_docs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sales-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "sales_docs_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sales-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
  );
