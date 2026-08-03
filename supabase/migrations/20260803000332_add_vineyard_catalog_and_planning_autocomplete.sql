create table public.plot_catalog (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  farm text not null default '',
  vineyard text not null default '',
  plot_name text not null check (char_length(btrim(plot_name)) > 0),
  plot_code text not null default '',
  sector text not null default '',
  variety text not null default '',
  planting_year smallint check (planting_year between 1800 and 2200),
  area numeric(12, 3) check (area >= 0),
  agronomist text not null default '',
  sample_type text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, farm, vineyard, plot_name, plot_code)
);

create index plot_catalog_workspace_lookup_idx
  on public.plot_catalog (workspace_id, farm, vineyard, plot_name, plot_code);

create index plot_catalog_workspace_code_idx
  on public.plot_catalog (workspace_id, plot_code);

create trigger plot_catalog_set_updated_at
before update on public.plot_catalog
for each row execute function private.set_updated_at();

-- Preserve every existing vineyard record before removing duplicated reference data
-- from the weekly plan. If the same plot appears more than once, the most recently
-- updated row supplies the catalog attributes.
with ranked_plan_items as (
  select
    work_plans.workspace_id,
    plan_items.*,
    row_number() over (
      partition by work_plans.workspace_id, plan_items.farm, plan_items.vineyard,
        plan_items.plot_name, plan_items.plot_code
      order by plan_items.updated_at desc, plan_items.created_at desc
    ) as catalog_rank
  from public.plan_items
  join public.work_plans on work_plans.id = plan_items.work_plan_id
)
insert into public.plot_catalog (
  workspace_id, farm, vineyard, plot_name, plot_code, sector, variety,
  planting_year, area, agronomist, sample_type
)
select
  workspace_id, farm, vineyard, plot_name, plot_code, sector, variety,
  planting_year, area, agronomist, sample_type
from ranked_plan_items
where catalog_rank = 1;

alter table public.plan_items
  add column plot_catalog_id bigint references public.plot_catalog(id) on delete restrict;

update public.plan_items as plan_item
set plot_catalog_id = plot_catalog.id
from public.work_plans, public.plot_catalog
where work_plans.id = plan_item.work_plan_id
  and plot_catalog.workspace_id = work_plans.workspace_id
  and plot_catalog.farm = plan_item.farm
  and plot_catalog.vineyard = plan_item.vineyard
  and plot_catalog.plot_name = plan_item.plot_name
  and plot_catalog.plot_code = plan_item.plot_code;

do $$
begin
  if exists (select 1 from public.plan_items where plot_catalog_id is null) then
    raise exception 'Every existing plan item must be linked to a catalog plot';
  end if;
end;
$$;

alter table public.plan_items
  alter column plot_catalog_id set not null,
  drop column farm,
  drop column plot_name,
  drop column plot_code,
  drop column vineyard,
  drop column variety,
  drop column planting_year,
  drop column area,
  drop column agronomist,
  drop column sector,
  drop column sample_type,
  drop column color;

create index plan_items_catalog_idx
  on public.plan_items (plot_catalog_id);

alter table public.plot_catalog enable row level security;

create policy "Workspace members can read plot catalog"
on public.plot_catalog for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "Coordinators can create catalog plots"
on public.plot_catalog for insert
to authenticated
with check ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

create policy "Coordinators can update catalog plots"
on public.plot_catalog for update
to authenticated
using ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])))
with check ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

create policy "Coordinators can delete catalog plots"
on public.plot_catalog for delete
to authenticated
using ((select private.is_workspace_member(workspace_id, array['coordinator']::text[])));

-- Require the catalog entry selected for a task to belong to the same workspace
-- as the weekly plan, even if a coordinator belongs to multiple workspaces.
drop policy "Coordinators can create plan items" on public.plan_items;

create policy "Coordinators can create plan items"
on public.plan_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.work_plans
    join public.plot_catalog on plot_catalog.id = plot_catalog_id
    where work_plans.id = work_plan_id
      and plot_catalog.workspace_id = work_plans.workspace_id
      and (select private.is_workspace_member(work_plans.workspace_id, array['coordinator']::text[]))
  )
);

drop policy "Coordinators can update plan items" on public.plan_items;

create policy "Coordinators can update plan items"
on public.plan_items for update
to authenticated
using (
  exists (
    select 1
    from public.work_plans
    where work_plans.id = work_plan_id
      and (select private.is_workspace_member(work_plans.workspace_id, array['coordinator']::text[]))
  )
)
with check (
  exists (
    select 1
    from public.work_plans
    join public.plot_catalog on plot_catalog.id = plot_catalog_id
    where work_plans.id = work_plan_id
      and plot_catalog.workspace_id = work_plans.workspace_id
      and (select private.is_workspace_member(work_plans.workspace_id, array['coordinator']::text[]))
  )
);

revoke all on public.plot_catalog from anon;
grant select, insert, update, delete on public.plot_catalog to authenticated;
grant usage, select on sequence public.plot_catalog_id_seq to authenticated;
