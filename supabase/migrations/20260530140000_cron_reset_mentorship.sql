-- Cron mensual: reset de tickets de mentoría el día 1 de cada mes (00:00 UTC).
-- Llama a la function public.reset_mentorship_tickets() ya existente, que
-- pone mentorship_tickets_remaining = 40 (Enterprise) o 0 (otros planes).

-- Habilitar pg_cron (Supabase Pro+ ya lo tiene disponible; este crea el schema
-- "cron" si no existe). Si la extensión ya está, no hace nada.
create extension if not exists pg_cron with schema extensions;

-- Permisos para que el cron pueda llamar a la function reset_mentorship_tickets.
-- (La function está marcada security definer en su migración original, así que
-- corre con privilegios del owner y puede actualizar todos los profiles.)
grant usage on schema cron to postgres;

-- Si ya existe un job con el mismo nombre, lo eliminamos antes (evita
-- duplicados al re-correr la migración).
do $$
begin
  perform cron.unschedule('reset_mentorship_tickets_monthly');
exception when others then
  -- El job no existía; nada que hacer.
  null;
end $$;

-- Programar el job: día 1 de cada mes a las 00:00 UTC.
-- Cron syntax: "minuto hora día-mes mes día-semana"
select cron.schedule(
  'reset_mentorship_tickets_monthly',
  '0 0 1 * *',
  $$ select public.reset_mentorship_tickets(); $$
);

-- Cómo verificar después de aplicar:
--   select * from cron.job where jobname = 'reset_mentorship_tickets_monthly';
--   select * from cron.job_run_details
--     where jobname = 'reset_mentorship_tickets_monthly'
--     order by start_time desc limit 10;
