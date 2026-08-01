import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskContextType {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  clearTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasksState] = useState<Task[]>(() => {
    const saved = localStorage.getItem('vineyard_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tasks from local storage', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('vineyard_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const setTasks = (newTasks: Task[]) => {
    setTasksState(newTasks);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasksState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const clearTasks = () => {
    setTasksState([]);
  };

  return (
    <TaskContext.Provider value={{ tasks, setTasks, updateTask, clearTasks }}>
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
