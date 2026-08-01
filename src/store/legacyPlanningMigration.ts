import { PlanItem, PlanItemStatus } from '../types';

const LEGACY_STORAGE_KEYS = ['magof.plan-items.v2', 'magof.tasks.v1', 'vineyard_tasks'] as const;

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function migrateStatus(value: unknown, team: string): PlanItemStatus {
  if (value === PlanItemStatus.DEFERRED) return PlanItemStatus.DEFERRED;
  if (value === PlanItemStatus.CANCELLED) return PlanItemStatus.CANCELLED;
  if (value === PlanItemStatus.ASSIGNED || value === 'שויך') return PlanItemStatus.ASSIGNED;
  return team ? PlanItemStatus.ASSIGNED : PlanItemStatus.PLANNED;
}

function migrateItem(value: unknown): PlanItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = asText(item.id);
  const date = asText(item.date);
  const plotName = asText(item.plotName);
  if (!id || !/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !plotName) return null;

  const team = asText(item.team);
  return {
    id,
    date,
    farm: asText(item.farm),
    plotName,
    plotCode: asText(item.plotCode),
    vineyard: asText(item.vineyard),
    variety: asText(item.variety),
    plantingYear: asText(item.plantingYear),
    area: asText(item.area),
    agronomist: asText(item.agronomist),
    team,
    plannedSamples: asText(item.plannedSamples ?? item.samplesCount) || '1',
    sector: asText(item.sector ?? item.note),
    sampleType: asText(item.sampleType),
    color: asText(item.color),
    coordinatorNote: asText(item.coordinatorNote) || undefined,
    status: migrateStatus(item.status, team),
  };
}

export function readLegacyPlanItems(): PlanItem[] {
  const key = LEGACY_STORAGE_KEYS.find((storageKey) => localStorage.getItem(storageKey) !== null);
  if (!key) return [];

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateItem).filter((item): item is PlanItem => item !== null);
  } catch (error) {
    console.error('Failed to read legacy planning data', error);
    return [];
  }
}

export function clearLegacyPlanItems(): void {
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}
