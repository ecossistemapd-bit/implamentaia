insert into storage.buckets (id, name, public) values ('solution-covers', 'solution-covers', true) on conflict (id) do nothing;

create policy "solution-covers public read"
on storage.objects for select
using (bucket_id = 'solution-covers');

create policy "solution-covers admin write"
on storage.objects for insert
with check (bucket_id = 'solution-covers' and public.is_admin(auth.uid()));

create policy "solution-covers admin update"
on storage.objects for update
using (bucket_id = 'solution-covers' and public.is_admin(auth.uid()));