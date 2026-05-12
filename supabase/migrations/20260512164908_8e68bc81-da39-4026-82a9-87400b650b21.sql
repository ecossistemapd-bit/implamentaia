create table public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  website text,
  logo_url text,
  monthly_cost_usd numeric,
  cost_label text,
  created_at timestamptz default now()
);

alter table public.tools enable row level security;

create policy "tools readable by authenticated" on public.tools
  for select to authenticated using (true);

create policy "tools admin manage" on public.tools
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.solution_tools (
  solution_id uuid not null references public.solutions(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete cascade,
  is_essential boolean not null default true,
  display_order int default 0,
  primary key (solution_id, tool_id)
);

alter table public.solution_tools enable row level security;

create policy "solution_tools readable by authenticated" on public.solution_tools
  for select to authenticated using (true);

create policy "solution_tools admin manage" on public.solution_tools
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

do $$
declare
  sol record;
  tool_name text;
  new_tool_id uuid;
  ord int;
begin
  for sol in select id, tools_required, integrations from public.solutions
  loop
    ord := 0;
    if sol.tools_required is not null then
      foreach tool_name in array sol.tools_required
      loop
        if tool_name is null or trim(tool_name) = '' then continue; end if;
        insert into public.tools (name, slug, website)
        values (
          trim(tool_name),
          lower(regexp_replace(trim(tool_name), '[^a-zA-Z0-9]+', '-', 'g')),
          lower(regexp_replace(trim(tool_name), '[^a-zA-Z0-9]+', '', 'g')) || '.com'
        )
        on conflict (name) do nothing;
        select id into new_tool_id from public.tools where name = trim(tool_name);
        insert into public.solution_tools (solution_id, tool_id, is_essential, display_order)
        values (sol.id, new_tool_id, true, ord)
        on conflict do nothing;
        ord := ord + 1;
      end loop;
    end if;
    if sol.integrations is not null then
      foreach tool_name in array sol.integrations
      loop
        if tool_name is null or trim(tool_name) = '' then continue; end if;
        insert into public.tools (name, slug, website)
        values (
          trim(tool_name),
          lower(regexp_replace(trim(tool_name), '[^a-zA-Z0-9]+', '-', 'g')),
          lower(regexp_replace(trim(tool_name), '[^a-zA-Z0-9]+', '', 'g')) || '.com'
        )
        on conflict (name) do nothing;
        select id into new_tool_id from public.tools where name = trim(tool_name);
        insert into public.solution_tools (solution_id, tool_id, is_essential, display_order)
        values (sol.id, new_tool_id, false, ord)
        on conflict do nothing;
        ord := ord + 1;
      end loop;
    end if;
  end loop;
end $$;