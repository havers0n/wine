/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaskProvider } from './store/TaskContext';
import UploadPage from './pages/UploadPage';
import PlanPage from './pages/PlanPage';
import WorkerPage from './pages/WorkerPage';
import CreateTaskPage from './pages/CreateTaskPage';
import { UploadCloud, CalendarDays, Smartphone, LayoutDashboard, PlusCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'plan' | 'worker' | 'create'>('plan');

  return (
    <TaskProvider>
      <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans" dir="rtl">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-emerald-900 text-white flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-8 h-8 bg-emerald-500 rounded items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">MAGOF <span className="font-normal opacity-70 hidden sm:inline">Coordinator</span></h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-medium uppercase tracking-widest">
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              מערכת פעילה
            </div>
            <div className="flex bg-black/20 rounded p-1">
              <button
                onClick={() => setActiveTab('plan')}
                className={cn(
                  "px-3 py-1 rounded font-bold transition-colors flex items-center gap-2",
                  activeTab === 'plan' ? "bg-white text-emerald-900" : "text-white hover:bg-white/10"
                )}
              >
                תכנון
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={cn(
                  "px-3 py-1 rounded font-bold transition-colors flex items-center gap-2",
                  activeTab === 'create' ? "bg-white text-emerald-900" : "text-white hover:bg-white/10"
                )}
              >
                יצירה ידנית
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "px-3 py-1 rounded font-bold transition-colors flex items-center gap-2",
                  activeTab === 'upload' ? "bg-white text-emerald-900" : "text-white hover:bg-white/10"
                )}
              >
                ייבוא
              </button>
              <button
                onClick={() => setActiveTab('worker')}
                className={cn(
                  "px-3 py-1 rounded font-bold transition-colors flex items-center gap-2",
                  activeTab === 'worker' ? "bg-white text-emerald-900" : "text-white hover:bg-white/10"
                )}
              >
                עובד
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'upload' && <UploadPage />}
          {activeTab === 'plan' && <PlanPage />}
          {activeTab === 'worker' && <WorkerPage />}
          {activeTab === 'create' && <CreateTaskPage />}
        </main>

        {/* Footer Status Bar */}
        <footer className="hidden sm:flex h-8 bg-slate-800 text-white text-[10px] uppercase font-bold items-center px-6 justify-between shrink-0">
          <div className="flex gap-4 items-center">
            <span className="text-emerald-400">● מערכת פעילה</span>
            <span className="opacity-50 border-r border-white/10 pr-4">v0.2.1-MVP</span>
          </div>
          <div className="flex gap-6 opacity-70">
            <span>בציר פורה</span>
            <span>מענית • כרמל</span>
          </div>
        </footer>
        
        {/* Mobile Navigation (Bottom bar) - simplified for mobile fallback if needed, but we integrated into top bar. Let's keep a small bar for mobile or just use top bar */}
      </div>
    </TaskProvider>
  );
}
