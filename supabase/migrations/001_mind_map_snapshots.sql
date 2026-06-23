create table if not exists public.mind_map_snapshots (
  id text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_mind_map_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_mind_map_snapshots_updated_at
on public.mind_map_snapshots;

create trigger set_mind_map_snapshots_updated_at
before update on public.mind_map_snapshots
for each row
execute function public.set_mind_map_snapshots_updated_at();

alter table public.mind_map_snapshots enable row level security;

drop policy if exists mind_map_snapshots_select_own
on public.mind_map_snapshots;

drop policy if exists mind_map_snapshots_insert_own
on public.mind_map_snapshots;

drop policy if exists mind_map_snapshots_update_own
on public.mind_map_snapshots;

drop policy if exists mind_map_snapshots_delete_own
on public.mind_map_snapshots;

create policy mind_map_snapshots_select_own
on public.mind_map_snapshots
for select
to authenticated
using (id = auth.uid()::text);

create policy mind_map_snapshots_insert_own
on public.mind_map_snapshots
for insert
to authenticated
with check (id = auth.uid()::text);

create policy mind_map_snapshots_update_own
on public.mind_map_snapshots
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

create policy mind_map_snapshots_delete_own
on public.mind_map_snapshots
for delete
to authenticated
using (id = auth.uid()::text);
