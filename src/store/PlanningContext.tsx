import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { PlanItem } from '../types';
import {
  PlanningAccessContext,
  addPlanItem as addPlanItemToRepository,
  clearPlanItems as clearRepositoryPlanItems,
  getPlanningAccessContext,
  listPlanItems,
  replacePlanItems,
  updatePlanItem as updateRepositoryPlanItem,
} from '../services/planningRepository';
import { clearLegacyPlanItems, readLegacyPlanItems } from './legacyPlanningMigration';

interface PlanningContextType {
  planItems: PlanItem[];
  access: PlanningAccessContext | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  addPlanItem: (item: PlanItem) => Promise<void>;
  mergePlanItems: (items: PlanItem[]) => Promise<void>;
  updatePlanItem: (id: string, updates: Partial<PlanItem>) => Promise<void>;
  clearPlanItems: () => Promise<void>;
  refreshPlanItems: () => Promise<void>;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown planning repository error.';
}

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [access, setAccess] = useState<PlanningAccessContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPlanItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessContext = await getPlanningAccessContext();
      let remoteItems = await listPlanItems();

      if (remoteItems.length === 0 && accessContext.role === 'coordinator') {
        const legacyItems = readLegacyPlanItems();
        if (legacyItems.length > 0) {
          await replacePlanItems(legacyItems);
          clearLegacyPlanItems();
          remoteItems = legacyItems;
        }
      }

      setAccess(accessContext);
      setPlanItems(remoteItems);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPlanItems();
  }, [refreshPlanItems]);

  const runMutation = async (mutation: () => Promise<void>, onSuccess: () => void) => {
    setIsSaving(true);
    setError(null);
    try {
      await mutation();
      onSuccess();
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
      () => addPlanItemToRepository(item),
      () => setPlanItems((currentItems) => [...currentItems, item]),
    );
  };

  const mergePlanItems = async (items: PlanItem[]) => {
    const currentById = new Map(planItems.map((item) => [item.id, item]));
    const mergedItems = items.map((item) => {
      const current = currentById.get(item.id);
      if (!current) return item;
      return {
        ...item,
        status: current.status,
        coordinatorNote: current.coordinatorNote ?? item.coordinatorNote,
      };
    });

    await runMutation(
      () => replacePlanItems(mergedItems),
      () => setPlanItems(mergedItems),
    );
  };

  const updatePlanItem = async (id: string, updates: Partial<PlanItem>) => {
    const current = planItems.find((item) => item.id === id);
    if (!current) throw new Error(`Plan item not found: ${id}`);
    const updatedItem = { ...current, ...updates };

    await runMutation(
      () => updateRepositoryPlanItem(updatedItem),
      () => setPlanItems((items) => items.map((item) => (item.id === id ? updatedItem : item))),
    );
  };

  const clearPlanItems = async () => {
    await runMutation(clearRepositoryPlanItems, () => setPlanItems([]));
  };

  return (
    <PlanningContext.Provider
      value={{
        planItems,
        access,
        isLoading,
        isSaving,
        error,
        addPlanItem,
        mergePlanItems,
        updatePlanItem,
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
