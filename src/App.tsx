/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { LoaderCircle, LogOut, Printer, RefreshCw } from 'lucide-react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { PlanningProvider, usePlanning } from './store/PlanningContext';
import AuthGate from './components/AuthGate';
import PlanPage from './pages/PlanPage';
import WorkerPage from './pages/WorkerPage';
import CreateTaskPage from './pages/CreateTaskPage';
import { cn } from './lib/utils';

const UploadPage = lazy(() => import('./pages/UploadPage'));
const WeeklyPlanPrint = lazy(() => import('./pages/WeeklyPlanPrint'));
type AppTab = 'upload' | 'plan' | 'worker' | 'create' | 'print';

function PlannerApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('plan');
  const { user, signOut } = useAuth();
  const { access, isLoading, error, refreshPlanItems } = usePlanning();
  const canManage = access?.role === 'coordinator';

  useEffect(() => {
    if (access?.role === 'team') setActiveTab('worker');
  }, [access?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-emerald-700 gap-3" dir="rtl">
        <LoaderCircle className="w-8 h-8 animate-spin" />
        <span className="text-sm font-bold">טוען תוכנית עבודה מ-Supabase…</span>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md bg-white border border-rose-200 rounded-xl p-6 text-center shadow-sm">
          <h1 className="text-lg font-black text-slate-900">לא ניתן לטעון את תוכנית העבודה</h1>
          <p className="mt-2 text-sm text-rose-700 break-words" dir="ltr">{error}</p>
          <button
            type="button"
            onClick={() => void refreshPlanItems()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" /> נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="magof-app-shell flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans" dir="rtl">
      <header className="app-chrome min-h-14 bg-emerald-900 text-white flex items-center justify-between px-3 sm:px-6 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex w-9 h-9 sm:w-10 sm:h-10 overflow-hidden rounded-lg bg-white shadow-sm shrink-0 items-center justify-center">
            <img
              src="/magof-logo.png"
              alt="MAGOF"
              className="w-full h-full object-cover scale-[2.05]"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight uppercase truncate">MAGOF <span className="font-normal opacity-70 hidden sm:inline">Planner</span></h1>
            <p className="hidden sm:block text-[9px] text-white/60 truncate">{access.workspaceName} • {access.workPlanName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <nav className="flex bg-black/20 rounded p-1 overflow-x-auto" aria-label="ניווט ראשי">
            {canManage && (
              <>
                <button type="button" onClick={() => setActiveTab('plan')} className={cn('px-2 sm:px-3 py-1 rounded font-bold transition-colors text-[10px] sm:text-xs whitespace-nowrap', activeTab === 'plan' ? 'bg-white text-emerald-900' : 'text-white hover:bg-white/10')}>תכנון</button>
                <button type="button" onClick={() => setActiveTab('create')} className={cn('px-2 sm:px-3 py-1 rounded font-bold transition-colors text-[10px] sm:text-xs whitespace-nowrap', activeTab === 'create' ? 'bg-white text-emerald-900' : 'text-white hover:bg-white/10')}>משימת דיגום חדשה</button>
                <button type="button" onClick={() => setActiveTab('upload')} className={cn('px-2 sm:px-3 py-1 rounded font-bold transition-colors text-[10px] sm:text-xs whitespace-nowrap', activeTab === 'upload' ? 'bg-white text-emerald-900' : 'text-white hover:bg-white/10')}>ייבוא</button>
                <button type="button" onClick={() => setActiveTab('print')} className={cn('px-2 sm:px-3 py-1 rounded font-bold transition-colors text-[10px] sm:text-xs whitespace-nowrap inline-flex items-center gap-1', activeTab === 'print' ? 'bg-white text-emerald-900' : 'text-white hover:bg-white/10')}><Printer className="w-3 h-3" /> PDF</button>
              </>
            )}
            <button type="button" onClick={() => setActiveTab('worker')} className={cn('px-2 sm:px-3 py-1 rounded font-bold transition-colors text-[10px] sm:text-xs whitespace-nowrap', activeTab === 'worker' ? 'bg-white text-emerald-900' : 'text-white hover:bg-white/10')}>{canManage ? 'תצוגת צוות' : 'היום שלי'}</button>
          </nav>

          <button
            type="button"
            onClick={() => void signOut()}
            className="p-1.5 rounded bg-black/10 hover:bg-black/20 text-white/80"
            title={`יציאה: ${user?.email ?? ''}`}
            aria-label="יציאה"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {error && (
        <div className="app-chrome bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2 text-xs font-bold flex items-center justify-between gap-3">
          <span className="truncate" dir="ltr">{error}</span>
          <button type="button" onClick={() => void refreshPlanItems()} className="shrink-0 underline">נסה שוב</button>
        </div>
      )}

      <main className="app-main flex-1 overflow-y-auto">
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">טוען…</div>}>
          {activeTab === 'upload' && canManage && <UploadPage />}
          {activeTab === 'plan' && canManage && <PlanPage />}
          {activeTab === 'worker' && <WorkerPage />}
          {activeTab === 'create' && canManage && <CreateTaskPage />}
          {activeTab === 'print' && canManage && <WeeklyPlanPrint onBack={() => setActiveTab('plan')} />}
        </Suspense>
      </main>

      <footer className="app-chrome hidden sm:flex h-8 bg-slate-800 text-white text-[10px] uppercase font-bold items-center px-6 justify-between shrink-0">
        <div className="flex gap-4 items-center">
          <span className="opacity-70">תכנון צוותי דיגום</span>
          <span className="opacity-50 border-r border-white/10 pr-4">v0.1.0</span>
        </div>
        <div className="opacity-80">פותח ב❤️ על ידי דניאל</div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PlanningProvider>
          <PlannerApp />
        </PlanningProvider>
      </AuthGate>
    </AuthProvider>
  );
}
