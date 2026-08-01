alter table public.workspace_members
add column team_name text;

alter table public.workspace_members
add constraint workspace_members_team_name_length
check (
  team_name is null
  or char_length(btrim(team_name)) between 1 and 120
);

create or replace function private.is_workspace_team_member(
  target_workspace_id bigint,
  target_team_name text
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
      and role = 'team'
      and team_name is not null
      and btrim(team_name) = btrim(target_team_name)
  );
$$;

revoke all on function private.is_workspace_team_member(bigint, text)
from public, anon;

grant execute on function private.is_workspace_team_member(bigint, text)
to authenticated;

drop policy "Coordinators and published plan members can read plan items"
on public.plan_items;

create policy "Coordinators and assigned team members can read plan items"
on public.plan_items for select
to authenticated
using (
  exists (
    select 1
    from public.work_plans
    where id = work_plan_id
      and (
        (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
        or (
          status = 'פורסם'
          and (select private.is_workspace_team_member(workspace_id, team))
        )
      )
  )
);
