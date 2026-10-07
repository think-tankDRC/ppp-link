-- Warning: the dashboard is intentionally public. Anyone with the project URL
-- can read and delete registrations through the anonymous key.
create table if not exists public.inscriptions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null,
  email text not null,
  phone text not null,
  company text not null,
  role text,
  training_session text not null,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'valid', 'refused')),
  created_at timestamptz not null default now()
);

alter table public.inscriptions enable row level security;

revoke all on public.inscriptions from anon, authenticated;
grant insert on public.inscriptions to anon, authenticated;
grant select, delete on public.inscriptions to anon, authenticated;

drop policy if exists "Public can submit an inscription" on public.inscriptions;
create policy "Public can submit an inscription"
  on public.inscriptions for insert to anon, authenticated
  with check (true);

drop policy if exists "Public can read inscriptions" on public.inscriptions;
drop policy if exists "Authenticated staff can read inscriptions" on public.inscriptions;
create policy "Public can read inscriptions"
  on public.inscriptions for select to anon, authenticated
  using (true);

drop policy if exists "Public can delete inscriptions" on public.inscriptions;
drop policy if exists "Authenticated staff can delete inscriptions" on public.inscriptions;
create policy "Public can delete inscriptions"
  on public.inscriptions for delete to anon, authenticated
  using (true);
