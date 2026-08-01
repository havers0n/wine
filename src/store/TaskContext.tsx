import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskContextType {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  mergeTasks: (tasks: Task[]) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  clearTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);
const STORAGE_KEY = 'magof.tasks.v1';
const LEGACY_STORAGE_KEY = 'vineyard_tasks';

function loadTasks(): Task[] {
  const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as Task[] : [];
  } catch (error) {
    console.error('Failed to parse tasks from local storage', error);
    return [];
  }
}

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasksState] = useState<Task[]>(loadTasks);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to persist tasks to local storage', error);
    }
  }, [tasks]);

  const setTasks = (newTasks: Task[]) => {
    setTasksState(newTasks);
  };

  const mergeTasks = (newTasks: Task[]) => {
    setTasksState((currentTasks) => {
      const currentById = new Map(currentTasks.map((task) => [task.id, task]));

      return newTasks.map((task) => {
        const current = currentById.get(task.id);
        if (!current) return task;

        return {
          ...task,
          status: current.status,
          workerComment: current.workerComment,
          actualSamples: current.actualSamples,
          executionTime: current.executionTime,
        };
      });
    });
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasksState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const clearTasks = () => {
    setTasksState([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  };

  return (
    <TaskContext.Provider value={{ tasks, setTasks, mergeTasks, updateTask, clearTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
