drop policy "Members can read plans" on public.work_plans;

create policy "Coordinators and published plan members can read plans"
on public.work_plans for select
to authenticated
using (
  (select private.is_workspace_member(workspace_id, array['coordinator']::text[]))
  or (
    status = 'פורסם'
    and (select private.is_workspace_member(workspace_id, array['team']::text[]))
  )
);

drop policy "Members can read plan items" on public.plan_items;

create policy "Coordinators and published plan members can read plan items"
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
          and (select private.is_workspace_member(workspace_id, array['team']::text[]))
        )
      )
  )
);
