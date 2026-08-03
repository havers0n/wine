import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { PlanItem, PlanItemStatus, WorkPlanStatus } from '../types';
import {
  PlanningAccessContext,
  PlotCatalogEntry,
  addPlanItem as addPlanItemToRepository,
  clearPlanItems as clearRepositoryPlanItems,
  getPlanningAccessContext,
  listPlanItems,
  listPlotCatalog,
  replacePlanItems,
  upsertPlanItems,
  updatePlanItem as updateRepositoryPlanItem,
  updatePlanItems as updateRepositoryPlanItems,
  updateWorkPlanStatus as updateRepositoryWorkPlanStatus,
} from '../services/planningRepository';
import { clearLegacyPlanItems, readLegacyPlanItems } from './legacyPlanningMigration';

interface PlanningContextType {
  planItems: PlanItem[];
  plotCatalog: PlotCatalogEntry[];
  access: PlanningAccessContext | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  addPlanItem: (item: PlanItem) => Promise<void>;
  mergePlanItems: (items: PlanItem[]) => Promise<void>;
  updatePlanItem: (id: string, updates: Partial<PlanItem>) => Promise<void>;
  updatePlanItems: (ids: string[], updates: Partial<PlanItem>) => Promise<void>;
  setWorkPlanStatus: (status: WorkPlanStatus) => Promise<void>;
  clearPlanItems: () => Promise<void>;
  refreshPlanItems: () => Promise<void>;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown planning repository error.';
}

function applyPlanItemUpdates(item: PlanItem, updates: Partial<PlanItem>): PlanItem {
  const updatedItem = { ...item, ...updates };

  if (
    updates.team !== undefined
    && (item.status === PlanItemStatus.PLANNED || item.status === PlanItemStatus.ASSIGNED)
  ) {
    updatedItem.status = updates.team.trim() ? PlanItemStatus.ASSIGNED : PlanItemStatus.PLANNED;
  }

  return updatedItem;
}

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [plotCatalog, setPlotCatalog] = useState<PlotCatalogEntry[]>([]);
  const [access, setAccess] = useState<PlanningAccessContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPlanItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessContext = await getPlanningAccessContext();
      let [remoteItems, catalogItems] = await Promise.all([listPlanItems(), listPlotCatalog()]);

      if (remoteItems.length === 0 && accessContext.role === 'coordinator') {
        const legacyItems = readLegacyPlanItems();
        if (legacyItems.length > 0) {
          await replacePlanItems(legacyItems);
          clearLegacyPlanItems();
          remoteItems = legacyItems;
          catalogItems = await listPlotCatalog();
        }
      }

      setAccess(accessContext);
      setPlanItems(remoteItems);
      setPlotCatalog(catalogItems);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPlanItems();
  }, [refreshPlanItems]);

  const runMutation = async <Result,>(
    mutation: () => Promise<Result>,
    onSuccess: (result: Result) => void,
  ): Promise<Result> => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await mutation();
      onSuccess(result);
      return result;
    } catch (mutationError) {
      const message = errorMessage(mutationError);
      setError(message);
      throw mutationError;
    } finally {
      setIsSaving(false);
    }
  };

  const addPlanItem = async (item: PlanItem) => {
    await runMutation(
      async () => {
        await addPlanItemToRepository(item);
        return listPlotCatalog();
      },
      (catalogItems) => {
        setPlanItems((currentItems) => [...currentItems, item]);
        setPlotCatalog(catalogItems);
      },
    );
  };

  const mergePlanItems = async (items: PlanItem[]) => {
    const currentById = new Map(planItems.map((item) => [item.id, item]));
    const mergedImports = items.map((item) => {
      const current = currentById.get(item.id);
      if (!current) return item;
      return {
        ...item,
        status: current.status,
        coordinatorNote: current.coordinatorNote ?? item.coordinatorNote,
      };
    });
    const importedIds = new Set(mergedImports.map((item) => item.id));
    const mergedItems = [
      ...planItems.filter((item) => !importedIds.has(item.id)),
      ...mergedImports,
    ];

    await runMutation(
      async () => {
        await upsertPlanItems(mergedImports);
        return listPlotCatalog();
      },
      (catalogItems) => {
        setPlanItems(mergedItems);
        setPlotCatalog(catalogItems);
      },
    );
  };

  const updatePlanItem = async (id: string, updates: Partial<PlanItem>) => {
    const current = planItems.find((item) => item.id === id);
    if (!current) throw new Error(`Plan item not found: ${id}`);
    const updatedItem = applyPlanItemUpdates(current, updates);

    await runMutation(
      () => updateRepositoryPlanItem(updatedItem),
      () => setPlanItems((items) => items.map((item) => (item.id === id ? updatedItem : item))),
    );
  };

  const updatePlanItems = async (ids: string[], updates: Partial<PlanItem>) => {
    const selectedIds = new Set(ids);
    const updatedItems = planItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => applyPlanItemUpdates(item, updates));
    if (updatedItems.length === 0) throw new Error('No plan items were selected.');

    const updatedById = new Map(updatedItems.map((item) => [item.id, item]));
    await runMutation(
      () => updateRepositoryPlanItems(updatedItems),
      () => setPlanItems((items) => items.map((item) => updatedById.get(item.id) ?? item)),
    );
  };

  const setWorkPlanStatus = async (status: WorkPlanStatus) => {
    await runMutation(
      () => updateRepositoryWorkPlanStatus(status),
      (updatedAccess) => setAccess(updatedAccess),
    );
  };

  const clearPlanItems = async () => {
    await runMutation(clearRepositoryPlanItems, () => setPlanItems([]));
  };

  return (
    <PlanningContext.Provider
      value={{
        planItems,
        plotCatalog,
        access,
        isLoading,
        isSaving,
        error,
        addPlanItem,
        mergePlanItems,
        updatePlanItem,
        updatePlanItems,
        setWorkPlanStatus,
        clearPlanItems,
        refreshPlanItems,
      }}
    >
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const context = useContext(PlanningContext);
  if (!context) throw new Error('usePlanning must be used within a PlanningProvider');
  return context;
}
