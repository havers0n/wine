alter table public.workspaces
  add constraint workspaces_created_by_name_key unique (created_by, name);

alter table public.work_plans
  add constraint work_plans_workspace_id_name_key unique (workspace_id, name);
