create index workspaces_created_by_idx
  on public.workspaces (created_by);

create index work_plans_created_by_idx
  on public.work_plans (created_by);
