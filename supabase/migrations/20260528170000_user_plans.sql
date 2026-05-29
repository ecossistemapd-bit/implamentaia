-- Planes de usuario: cada profile tiene un plan_key (Starter / Pro / Enterprise)
-- y contadores para features con cantidad (tickets de mentoría / etc).

alter table public.profiles
  add column if not exists plan_key text not null default 'pro'
    check (plan_key in ('starter', 'pro', 'enterprise')),
  add column if not exists mentorship_tickets_remaining integer not null default 0,
  add column if not exists mentorship_tickets_period_start date not null default current_date;

create index if not exists profiles_plan_key_idx on public.profiles (plan_key);

-- Decrementa 1 ticket de mentoría si el usuario tiene Enterprise y le quedan.
-- Devuelve true si se pudo restar, false si no (sin plan, sin tickets, etc).
-- Se llama desde el cliente vía supabase.rpc('consume_mentorship_ticket').
create or replace function public.consume_mentorship_ticket()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  remaining integer;
begin
  select plan_key, mentorship_tickets_remaining
    into current_plan, remaining
  from public.profiles
  where id = auth.uid();

  if current_plan is null then
    return false;
  end if;

  if current_plan <> 'enterprise' then
    return false;
  end if;

  if remaining is null or remaining <= 0 then
    return false;
  end if;

  update public.profiles
    set mentorship_tickets_remaining = remaining - 1
  where id = auth.uid();

  return true;
end;
$$;

revoke all on function public.consume_mentorship_ticket() from public;
grant execute on function public.consume_mentorship_ticket() to authenticated;

-- Reset mensual: setea los tickets al valor del plan vigente (40 Enterprise / 0 otros).
-- Se llama por cron el día 1 de cada mes (o manual desde admin).
create or replace function public.reset_mentorship_tickets()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
    set mentorship_tickets_remaining = case
      when plan_key = 'enterprise' then 40
      else 0
    end,
    mentorship_tickets_period_start = current_date;
$$;

revoke all on function public.reset_mentorship_tickets() from public;
-- Solo service_role o admins lo ejecutan (no se concede a authenticated).
