import { PlanItem, PlanItemStatus, WorkPlanStatus } from '../types';
import { getSupabaseClient } from './supabase/client';
import { PlanItemInsert, PlanItemRow } from './supabase/database.types';

export type WorkspaceRole = 'coordinator' | 'team';

export interface PlanningAccessContext {
  workspaceId: number;
  workspaceName: string;
  role: WorkspaceRole;
  workPlanId: number;
  workPlanName: string;
  workPlanStatus: WorkPlanStatus;
}

export class PlanningRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanningRepositoryError';
  }
}

let accessContextPromise: Promise<PlanningAccessContext> | null = null;
let accessContextUserId: string | null = null;

function configuredWorkspaceId(): number | null {
  const rawValue = import.meta.env.VITE_MAGOF_WORKSPACE_ID?.trim();
  if (!rawValue) return null;
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PlanningRepositoryError('VITE_MAGOF_WORKSPACE_ID must be a positive integer.');
  }
  return value;
}

function assertRole(value: string): WorkspaceRole {
  if (value === 'coordinator' || value === 'team') return value;
  throw new PlanningRepositoryError(`Unsupported workspace role: ${value}`);
}

function assertPlanStatus(value: string): WorkPlanStatus {
  if (Object.values(WorkPlanStatus).includes(value as WorkPlanStatus)) return value as WorkPlanStatus;
  throw new PlanningRepositoryError(`Unsupported work plan status: ${value}`);
}

function assertItemStatus(value: string): PlanItemStatus {
  if (Object.values(PlanItemStatus).includes(value as PlanItemStatus)) return value as PlanItemStatus;
  throw new PlanningRepositoryError(`Unsupported plan item status: ${value}`);
}

function toDatabaseDate(displayDate: string): string {
  const displayMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(displayDate);
  if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;
  throw new PlanningRepositoryError(`Invalid planning date: ${displayDate}`);
}

function fromDatabaseDate(databaseDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(databaseDate);
  if (!match) return databaseDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function optionalInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalDecimal(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function plannedSamples(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function toInsert(workPlanId: number, item: PlanItem): PlanItemInsert {
  return {
    work_plan_id: workPlanId,
    id: item.id,
    work_date: toDatabaseDate(item.date),
    farm: item.farm,
    plot_name: item.plotName,
    plot_code: item.plotCode,
    vineyard: item.vineyard,
    variety: item.variety,
    planting_year: optionalInteger(item.plantingYear),
    area: optionalDecimal(item.area),
    agronomist: item.agronomist,
    team: item.team,
    planned_samples: plannedSamples(item.plannedSamples),
    sector: item.sector,
    sample_type: item.sampleType,
    color: item.color,
    coordinator_note: item.coordinatorNote ?? null,
    status: item.status,
  };
}

function fromRow(row: PlanItemRow): PlanItem {
  return {
    id: row.id,
    date: fromDatabaseDate(row.work_date),
    farm: row.farm,
    plotName: row.plot_name,
    plotCode: row.plot_code,
    vineyard: row.vineyard,
    variety: row.variety,
    plantingYear: row.planting_year === null ? '' : String(row.planting_year),
    area: row.area === null ? '' : String(row.area),
    agronomist: row.agronomist,
    team: row.team,
    plannedSamples: String(row.planned_samples),
    sector: row.sector,
    sampleType: row.sample_type,
    color: row.color,
    coordinatorNote: row.coordinator_note ?? undefined,
    status: assertItemStatus(row.status),
  };
}

async function resolveAccessContext(userId: string): Promise<PlanningAccessContext> {
  const supabase = getSupabaseClient();
  const preferredWorkspaceId = configuredWorkspaceId();
  const defaultWorkspaceName = 'MAGOF';
  const defaultPlanName = 'תוכנית עבודה';
  let membershipQuery = supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1);

  if (preferredWorkspaceId) {
    membershipQuery = membershipQuery.eq('workspace_id', preferredWorkspaceId);
  }

  const { data: membership, error: membershipError } = await membershipQuery.maybeSingle();

  if (membershipError) throw new PlanningRepositoryError(membershipError.message);

  if (preferredWorkspaceId && !membership) {
    throw new PlanningRepositoryError(`Your account has no access to MAGOF workspace ${preferredWorkspaceId}.`);
  }

  let workspaceId = membership?.workspace_id;
  let role = membership ? assertRole(membership.role) : null;

  if (!workspaceId) {
    const { data: ownedWorkspace, error: ownedWorkspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('created_by', userId)
      .eq('name', defaultWorkspaceName)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedWorkspaceError) throw new PlanningRepositoryError(ownedWorkspaceError.message);

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      const { data: createdWorkspace, error: createWorkspaceError } = await supabase
        .from('workspaces')
        .upsert(
          { name: defaultWorkspaceName, created_by: userId },
          { onConflict: 'created_by,name', ignoreDuplicates: true },
        )
        .select('id')
        .maybeSingle();
      if (createWorkspaceError) throw new PlanningRepositoryError(createWorkspaceError.message);

      if (createdWorkspace) {
        workspaceId = createdWorkspace.id;
      } else {
        const { data: concurrentWorkspace, error: concurrentWorkspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('created_by', userId)
          .eq('name', defaultWorkspaceName)
          .single();
        if (concurrentWorkspaceError) throw new PlanningRepositoryError(concurrentWorkspaceError.message);
        workspaceId = concurrentWorkspace.id;
      }
    }

    const { error: membershipCreateError } = await supabase
      .from('workspace_members')
      .upsert(
        { workspace_id: workspaceId, user_id: userId, role: 'coordinator' },
        { onConflict: 'workspace_id,user_id' },
      );
    if (membershipCreateError) throw new PlanningRepositoryError(membershipCreateError.message);
    role = 'coordinator';
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();
  if (workspaceError) throw new PlanningRepositoryError(workspaceError.message);

  const { data: existingPlan, error: planError } = await supabase
    .from('work_plans')
    .select('id, name, status')
    .eq('workspace_id', workspaceId)
    .neq('status', WorkPlanStatus.CANCELLED)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planError) throw new PlanningRepositoryError(planError.message);

  let plan = existingPlan;
  if (!plan) {
    if (role !== 'coordinator') {
      throw new PlanningRepositoryError('No work plan is available for this team member.');
    }
    const { data: createdPlan, error: createPlanError } = await supabase
      .from('work_plans')
      .upsert(
        {
          workspace_id: workspaceId,
          name: defaultPlanName,
          status: WorkPlanStatus.DRAFT,
          created_by: userId,
        },
        { onConflict: 'workspace_id,name', ignoreDuplicates: true },
      )
      .select('id, name, status')
      .maybeSingle();
    if (createPlanError) throw new PlanningRepositoryError(createPlanError.message);

    if (createdPlan) {
      plan = createdPlan;
    } else {
      const { data: concurrentPlan, error: concurrentPlanError } = await supabase
        .from('work_plans')
        .select('id, name, status')
        .eq('workspace_id', workspaceId)
        .eq('name', defaultPlanName)
        .single();
      if (concurrentPlanError) throw new PlanningRepositoryError(concurrentPlanError.message);
      plan = concurrentPlan;
    }
  }

  return {
    workspaceId,
    workspaceName: workspace.name,
    role: role ?? 'team',
    workPlanId: plan.id,
    workPlanName: plan.name,
    workPlanStatus: assertPlanStatus(plan.status),
  };
}

export async function getPlanningAccessContext(): Promise<PlanningAccessContext> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new PlanningRepositoryError(error?.message ?? 'Authentication required.');

  if (!accessContextPromise || accessContextUserId !== data.user.id) {
    accessContextUserId = data.user.id;
    accessContextPromise = resolveAccessContext(data.user.id);
  }

  try {
    return await accessContextPromise;
  } catch (error) {
    accessContextPromise = null;
    throw error;
  }
}

export async function listPlanItems(): Promise<PlanItem[]> {
  const context = await getPlanningAccessContext();
  const { data, error } = await getSupabaseClient()
    .from('plan_items')
    .select('*')
    .eq('work_plan_id', context.workPlanId)
    .order('work_date', { ascending: true })
    .order('team', { ascending: true })
    .order('plot_code', { ascending: true });
  if (error) throw new PlanningRepositoryError(error.message);
  return data.map(fromRow);
}

function requireCoordinator(context: PlanningAccessContext) {
  if (context.role !== 'coordinator') {
    throw new PlanningRepositoryError('Only coordinators can change the work plan.');
  }
}

export async function addPlanItem(item: PlanItem): Promise<void> {
  const context = await getPlanningAccessContext();
  requireCoordinator(context);
  const { error } = await getSupabaseClient()
    .from('plan_items')
    .upsert(toInsert(context.workPlanId, item), { onConflict: 'work_plan_id,id' });
  if (error) throw new PlanningRepositoryError(error.message);
}

export async function replacePlanItems(items: PlanItem[]): Promise<void> {
  const context = await getPlanningAccessContext();
  requireCoordinator(context);
  const supabase = getSupabaseClient();

  for (let index = 0; index < items.length; index += 500) {
    const rows = items.slice(index, index + 500).map((item) => toInsert(context.workPlanId, item));
    const { error } = await supabase
      .from('plan_items')
      .upsert(rows, { onConflict: 'work_plan_id,id' });
    if (error) throw new PlanningRepositoryError(error.message);
  }

  const { data: storedItems, error: storedItemsError } = await supabase
    .from('plan_items')
    .select('id')
    .eq('work_plan_id', context.workPlanId);
  if (storedItemsError) throw new PlanningRepositoryError(storedItemsError.message);

  const incomingIds = new Set(items.map((item) => item.id));
  const staleIds = storedItems.filter((item) => !incomingIds.has(item.id)).map((item) => item.id);
  for (let index = 0; index < staleIds.length; index += 200) {
    const { error } = await supabase
      .from('plan_items')
      .delete()
      .eq('work_plan_id', context.workPlanId)
      .in('id', staleIds.slice(index, index + 200));
    if (error) throw new PlanningRepositoryError(error.message);
  }
}

export async function updatePlanItem(item: PlanItem): Promise<void> {
  await addPlanItem(item);
}

export async function clearPlanItems(): Promise<void> {
  const context = await getPlanningAccessContext();
  requireCoordinator(context);
  const { error } = await getSupabaseClient()
    .from('plan_items')
    .delete()
    .eq('work_plan_id', context.workPlanId);
  if (error) throw new PlanningRepositoryError(error.message);
}
