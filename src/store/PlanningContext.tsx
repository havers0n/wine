import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlanItem, PlanItemStatus } from '../types';

interface PlanningContextType {
  planItems: PlanItem[];
  setPlanItems: (items: PlanItem[]) => void;
  mergePlanItems: (items: PlanItem[]) => void;
  updatePlanItem: (id: string, updates: Partial<PlanItem>) => void;
  clearPlanItems: () => void;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);
const STORAGE_KEY = 'magof.plan-items.v2';
const PREVIOUS_STORAGE_KEYS = ['magof.tasks.v1', 'vineyard_tasks'] as const;

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function migrateStatus(value: unknown, team: string): PlanItemStatus {
  if (value === PlanItemStatus.DEFERRED) return PlanItemStatus.DEFERRED;
  if (value === PlanItemStatus.CANCELLED) return PlanItemStatus.CANCELLED;
  if (value === PlanItemStatus.ASSIGNED || value === 'שויך') return PlanItemStatus.ASSIGNED;
  return team ? PlanItemStatus.ASSIGNED : PlanItemStatus.PLANNED;
}

function migratePlanItem(value: unknown): PlanItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = asText(item.id);
  const date = asText(item.date);
  const plotName = asText(item.plotName);
  if (!id || !date || !plotName) return null;

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
    plannedSamples: asText(item.plannedSamples ?? item.samplesCount),
    sector: asText(item.sector ?? item.note),
    sampleType: asText(item.sampleType),
    color: asText(item.color),
    coordinatorNote: asText(item.coordinatorNote) || undefined,
    status: migrateStatus(item.status, team),
  };
}

function loadPlanItems(): PlanItem[] {
  const sourceKey = [STORAGE_KEY, ...PREVIOUS_STORAGE_KEYS]
    .find((key) => localStorage.getItem(key) !== null);
  if (!sourceKey) return [];

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(sourceKey) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migratePlanItem).filter((item): item is PlanItem => item !== null);
  } catch (error) {
    console.error('Failed to load planning data from local storage', error);
    return [];
  }
}

export const PlanningProvider = ({ children }: { children: ReactNode }) => {
  const [planItems, setPlanItemsState] = useState<PlanItem[]>(loadPlanItems);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(planItems));
      PREVIOUS_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to persist planning data to local storage', error);
    }
  }, [planItems]);

  const setPlanItems = (items: PlanItem[]) => {
    setPlanItemsState(items);
  };

  const mergePlanItems = (newItems: PlanItem[]) => {
    setPlanItemsState((currentItems) => {
      const currentById = new Map(currentItems.map((item) => [item.id, item]));

      return newItems.map((item) => {
        const current = currentById.get(item.id);
        if (!current) return item;
        return {
          ...item,
          status: current.status,
          coordinatorNote: current.coordinatorNote ?? item.coordinatorNote,
        };
      });
    });
  };

  const updatePlanItem = (id: string, updates: Partial<PlanItem>) => {
    setPlanItemsState((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const clearPlanItems = () => {
    setPlanItemsState([]);
    localStorage.removeItem(STORAGE_KEY);
    PREVIOUS_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  };

  return (
    <PlanningContext.Provider
      value={{ planItems, setPlanItems, mergePlanItems, updatePlanItem, clearPlanItems }}
    >
      {children}
    </PlanningContext.Provider>
  );
};

export const usePlanning = () => {
  const context = useContext(PlanningContext);
  if (context === undefined) {
    throw new Error('usePlanning must be used within a PlanningProvider');
  }
  return context;
};
