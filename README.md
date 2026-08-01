# MAGOF Planner

MAGOF is a planning and team-assignment interface for vineyard sampling work. It complements AKOLogic: MAGOF organizes days, teams, stops, and assignments, while AKOLogic remains responsible for field navigation, sample execution, weights, labels, and laboratory operations.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000`.

## Supabase setup

MAGOF stores planning data in Supabase. It does not use browser storage as its operational database.

1. Create or choose a dedicated Supabase project.
2. Link this repository and apply the checked-in migration:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

3. Copy `.env.example` to `.env.local` and fill in the project URL and its publishable key. Never put a secret or `service_role` key in a `VITE_` variable.
4. Add the local and deployed app URLs to the Supabase Auth redirect URL allow-list.
5. Create or invite the coordinator in Supabase Auth. Public sign-up is intentionally disabled.
6. Sign in with the coordinator email. The first login creates the initial `MAGOF` workspace and work plan.
7. Read the workspace ID from `public.workspaces`, set `VITE_MAGOF_WORKSPACE_ID`, and restart the app.

To grant an existing Supabase Auth user read-only team access, run this in the SQL editor as an administrator:

```sql
insert into public.workspace_members (workspace_id, user_id, role)
select 1, id, 'team'
from auth.users
where email = 'team.member@example.com'
on conflict (workspace_id, user_id)
do update set role = excluded.role;
```

Replace `1` with the MAGOF workspace ID. Coordinators can read and change plans; team members can only read them. Access is enforced with Row Level Security.

## Verification

```bash
npm run check
```

This runs strict TypeScript checking followed by a production build.
