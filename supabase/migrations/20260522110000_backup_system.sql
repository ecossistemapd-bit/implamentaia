-- ============================================================
-- SISTEMA DE BACKUP AUTOMÁTICO — 2026-05-22
-- Auto-contenido: no depende de acceso externo ni service keys.
-- Corre 100% dentro de Supabase vía pg_cron.
--
-- Qué hace:
--   · Exporta todas las tablas de usuarios a JSONB
--   · Guarda en `db_backups` con timestamp
--   · Auto-elimina backups de más de 30 días
--   · pg_cron lo ejecuta todos los días a las 3am UTC (midnight ARG)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLA de backups
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.db_backups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_name   TEXT        NOT NULL,
  total_rows  INTEGER     NOT NULL DEFAULT 0,
  size_bytes  INTEGER     NOT NULL DEFAULT 0,
  row_counts  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT        NOT NULL DEFAULT 'success',
  error_log   TEXT,
  data        JSONB       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.db_backups ENABLE ROW LEVEL SECURITY;
-- Sin policies = solo service_role puede leer/escribir

COMMENT ON TABLE public.db_backups IS
  'Snapshots diarios de todas las tablas de usuarios. Retención 30 días.';


-- ────────────────────────────────────────────────────────────
-- 2. FUNCIÓN principal de backup
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_daily_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables_to_backup TEXT[] := ARRAY[
    'profiles',
    'allowed_emails',
    'saved_solutions',
    'builder_projects',
    'builder_blueprints',
    'builder_sessions',
    'user_progress',
    'solution_steps_progress',
    'solution_comments'
  ];

  tbl          TEXT;
  table_data   JSONB;
  row_count    BIGINT;
  backup_data  JSONB  := '{}'::jsonb;
  row_counts   JSONB  := '{}'::jsonb;
  total_rows   BIGINT := 0;
  fname        TEXT;
  result       JSONB;
BEGIN
  fname := 'backup_' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD_HH24-MI-SS');

  -- Exportar cada tabla
  FOREACH tbl IN ARRAY tables_to_backup LOOP
    BEGIN
      EXECUTE format(
        'SELECT COUNT(*), COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM %I t',
        tbl
      ) INTO row_count, table_data;

      backup_data := backup_data || jsonb_build_object(tbl, table_data);
      row_counts  := row_counts  || jsonb_build_object(tbl, row_count);
      total_rows  := total_rows  + row_count;

    EXCEPTION WHEN OTHERS THEN
      backup_data := backup_data || jsonb_build_object(tbl, '[]'::jsonb);
      row_counts  := row_counts  || jsonb_build_object(tbl || '_error', SQLERRM);
    END;
  END LOOP;

  -- Guardar snapshot
  INSERT INTO public.db_backups (
    file_name, total_rows, size_bytes, row_counts, status, data
  ) VALUES (
    fname,
    total_rows,
    length(backup_data::text),
    row_counts,
    'success',
    backup_data
  );

  -- Eliminar backups de más de 30 días
  DELETE FROM public.db_backups
  WHERE created_at < now() - INTERVAL '30 days';

  result := jsonb_build_object(
    'success',    true,
    'file',       fname,
    'total_rows', total_rows,
    'row_counts', row_counts
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.db_backups (
    file_name, total_rows, size_bytes, row_counts, status, error_log, data
  ) VALUES (
    'backup_failed_' || to_char(now(), 'YYYY-MM-DD'),
    0, 0, '{}'::jsonb, 'failed', SQLERRM, '{}'::jsonb
  );

  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.run_daily_backup() IS
  'Exporta todas las tablas de usuarios a db_backups. Ejecutada por pg_cron cada noche.';


-- ────────────────────────────────────────────────────────────
-- 3. EXTENSIÓN pg_cron (ya incluida en Supabase)
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ────────────────────────────────────────────────────────────
-- 4. PROGRAMAR ejecución diaria: 3am UTC = midnight Argentina
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Eliminar job anterior si existe (evita duplicados en re-runs)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-db-backup') THEN
    PERFORM cron.unschedule('daily-db-backup');
  END IF;

  PERFORM cron.schedule(
    'daily-db-backup',
    '0 3 * * *',
    'SELECT public.run_daily_backup()'
  );
END $$;
