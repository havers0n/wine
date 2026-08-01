create schema if not exists private;

revoke all on schema private from public;

create table public.workspaces (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('coordinator', 'team')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx
  on public.workspace_members (user_id, workspace_id);

create table public.work_plans (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  status text not null default 'טיוטה'
    check (status in ('טיוטה', 'פורסם', 'נסגר', 'בוטל')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_plans_workspace_updated_idx
  on public.work_plans (workspace_id, updated_at desc);

create table public.plan_items (
  work_plan_id bigint not null references public.work_plans(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 160),
  work_date date not null,
  farm text not null default '',
  plot_name text not null check (char_length(btrim(plot_name)) > 0),
  plot_code text not null default '',
  vineyard text not null default '',
  variety text not null default '',
  planting_year smallint check (planting_year between 1800 and 2200),
  area numeric(12, 3) check (area >= 0),
  agronomist text not null default '',
  team text not null default '',
  planned_samples smallint not null default 1 check (planned_samples between 1 and 10000),
  sector text not null default '',
  sample_type text not null default '',
  color text not null default '',
  coordinator_note text,
  status text not null default 'מתוכנן'
    check (status in ('מתוכנן', 'שויך לצוות', 'נדחה', 'בוטל')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (work_plan_id, id)
);

create index plan_items_plan_date_team_idx
  on public.plan_items (work_plan_id, work_date, team);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function private.set_updated_at();

create trigger work_plans_set_updated_at
before update on public.work_plans
for each row execute function private.set_updated_at();

create trigger plan_items_set_updated_at
before update on public.plan_items
for each row execute function private.set_updated_at();

create or replace function private.is_workspace_member(
  target_workspace_id bigint,
  allowed_roles text[] default array['coordinator', 'team']::text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and role = any(allowed_roles)
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.is_workspace_member(bigint, text[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(bigint, text[]) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.work_plans enable row level security;
alter table public.plan_items enable row level security;

create policy "Members can read workspaces"
on public.workspaces for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_workspace_member(id))
);

create policy "Users can create workspaces"
on public.workspaces for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "Coordinators can update workspaces"
on public.workspaces for update
to authenticated
using ((select private.is_workspace_member(id, array['coordinator']::text[])))
with check ((select private.is_workspace_member(id, array['coordinator']::text[])));

create policy "Members can read memberships"
on public.workspace_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
);

create policy "Owners and coordinators can add members"
on public.workspace_members for insert
to authenticated
with check (
  (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
  or (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspaces
      where id = workspace_id
        and created_by = (select auth.uid())
    )
  )
);

create policy "Coordinators can update memberships"
on public.workspace_members for update
to authenticated
using ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])))
with check ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

create policy "Coordinators can remove memberships"
on public.workspace_members for delete
to authenticated
using ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

create policy "Members can read plans"
on public.work_plans for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "Coordinators can create plans"
on public.work_plans for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
);

create policy "Coordinators can update plans"
on public.work_plans for update
to authenticated
using ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])))
with check ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

create policy "Coordinators can delete plans"
on public.work_plans for delete
to authenticated
using ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

create policy "Members can read plan items"
on public.plan_items for select
to authenticated
using (
  exists (
    select 1
    from public.work_plans
    where id = work_plan_id
      and (select private.is_workspace_member(workspace_id))
  )
);

create policy "Coordinators can create plan items"
on public.plan_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.work_plans
    where id = work_plan_id
      and (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
  )
);

create policy "Coordinators can update plan items"
on public.plan_items for update
to authenticated
using (
  exists (
    select 1
    from public.work_plans
    where id = work_plan_id
      and (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
  )
)
with check (
  exists (
    select 1
    from public.work_plans
    where id = work_plan_id
      and (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
  )
);

create policy "Coordinators can delete plan items"
on public.plan_items for delete
to authenticated
using (
  exists (
    select 1
    from public.work_plans
    where id = work_plan_id
      and (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
  )
);

revoke all on public.workspaces, public.workspace_members, public.work_plans, public.plan_items
  from anon;

grant select, insert, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.work_plans to authenticated;
grant select, insert, update, delete on public.plan_items to authenticated;
grant usage, select on sequence public.workspaces_id_seq, public.work_plans_id_seq
  to authenticated;
