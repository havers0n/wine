import React, { useMemo, useState } from 'react';
import { useTasks } from '../store/TaskContext';
import { TaskStatus } from '../types';
import { MapPin, AlertTriangle, FileText, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { compareDisplayDates } from '../lib/dateUtils';

export default function WorkerPage() {
  const { tasks, updateTask } = useTasks();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Derive available teams
  const teams = useMemo(() => {
    const t = Array.from(new Set(tasks.map(task => task.team))).filter(Boolean);
    return t.sort();
  }, [tasks]);

  const teamDates = useMemo(() => {
    const dates = new Set(
      tasks.filter((task) => task.team === selectedTeam).map((task) => task.date),
    );
    return Array.from(dates).filter(Boolean).sort(compareDisplayDates);
  }, [tasks, selectedTeam]);

  const activeDate = selectedDate || teamDates[0] || '';

  const teamTasks = useMemo(() => {
    return tasks.filter((task) => task.team === selectedTeam && task.date === activeDate);
  }, [tasks, selectedTeam, activeDate]);

  // If no team selected, show team selector
  if (!selectedTeam) {
    return (
      <div className="max-w-md mx-auto p-4 py-12 animate-in fade-in flex flex-col items-center" dir="rtl">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
          <MapPin className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-6 text-center uppercase tracking-tight">בחר את הצוות שלך</h2>
        {teams.length === 0 ? (
          <p className="text-center text-slate-500 text-sm font-bold uppercase">אין צוותים מוגדרים במערכת כרגע</p>
        ) : (
          <div className="grid gap-3 w-full">
            {teams.map(team => (
              <button
                key={team}
                onClick={() => {
                  setSelectedTeam(team);
                  setSelectedDate('');
                }}
                className="bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-900 p-4 rounded-xl font-bold text-sm uppercase transition-all flex justify-between items-center"
              >
                צוות {team}
                <ChevronLeft className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleStatusChange = (id: string, status: TaskStatus) => {
    const task = tasks.find((candidate) => candidate.id === id);
    const workerComment = (commentDrafts[id] ?? task?.workerComment ?? '').trim() || undefined;
    updateTask(id, { status, workerComment });
    if (status === TaskStatus.DONE || status === TaskStatus.IMPOSSIBLE) {
       setActiveTask(null);
    }
  };

  const completedCount = teamTasks.filter(t => t.status === TaskStatus.DONE).length;
  const progress = teamTasks.length > 0 ? (completedCount / teamTasks.length) * 100 : 0;

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="pt-6 px-4 pb-4 bg-emerald-600 text-white shrink-0 shadow-sm relative">
        <button 
          onClick={() => {
            setSelectedTeam('');
            setSelectedDate('');
            setActiveTask(null);
          }}
          className="absolute top-4 left-4 text-[10px] text-white/80 font-bold uppercase tracking-widest px-2 py-1 bg-black/10 rounded"
        >
          החלף צוות
        </button>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{activeDate} • {teamTasks.length} משימות</h2>
        <div className="text-lg font-black uppercase tracking-tight mb-4">צוות {selectedTeam}</div>
        {teamDates.length > 1 && (
          <div className="flex gap-1 mb-4 overflow-x-auto" aria-label="בחירת יום עבודה">
            {teamDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setActiveTask(null);
                }}
                className={cn(
                  'rounded px-2.5 py-1 text-[10px] font-bold whitespace-nowrap',
                  date === activeDate ? 'bg-white text-emerald-800' : 'bg-black/10 text-white/80',
                )}
              >
                {date}
              </button>
            ))}
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-black w-8">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Task List */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {teamTasks.map(task => {
          const isDone = task.status === TaskStatus.DONE;
          const isExpanded = activeTask === task.id;
          
          return (
            <div 
              key={task.id} 
              className={cn(
                "bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden",
                isDone ? "border-emerald-200 opacity-60 bg-emerald-50/20" : "border-slate-200",
                isExpanded && !isDone && "ring-2 ring-emerald-500 border-emerald-500"
              )}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setActiveTask(isExpanded ? null : task.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter truncate pr-1">
                    {task.farm}
                  </span>
                  {isDone ? (
                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                      בוצע
                    </span>
                  ) : task.status === TaskStatus.IN_PROGRESS ? (
                    <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                      בעבודה
                    </span>
                  ) : task.status === TaskStatus.IMPOSSIBLE ? (
                    <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                      תקלה
                    </span>
                  ) : task.status === TaskStatus.ASSIGNED ? (
                    <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                      שויך
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                      מתוכנן
                    </span>
                  )}
                </div>
                
                <div className="font-black text-sm text-slate-900 leading-tight mb-1">
                  {task.variety}, חלקה {task.plotCode}
                </div>
                <div className="text-[10px] text-slate-500 mb-1 uppercase font-bold">
                  {task.plotName} • {task.samplesCount} דגימות • {task.plantingYear}
                </div>
                
                {task.note && !isExpanded && (
                  <div className="mt-2 text-[10px] text-amber-700 font-bold truncate flex items-center gap-1">
                    <FileText className="w-3 h-3" /> הערה: {task.note}
                  </div>
                )}
              </div>

              {/* Expanded Actions */}
              {isExpanded && !isDone && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 animate-in slide-in-from-top-2">
                  
                  {task.note && (
                     <div className="mb-3 bg-amber-50 border border-amber-100 p-2.5 rounded text-[10px] text-amber-900">
                       <span className="font-black block mb-0.5 uppercase">הערת קואורדינטור:</span>
                       {task.note}
                     </div>
                  )}

                  <div className="flex flex-col gap-2 mt-3">
                    <textarea 
                      placeholder="הוסף הערה או תיאור בעיה..."
                      className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none font-medium"
                      rows={2}
                      value={commentDrafts[task.id] ?? task.workerComment ?? ''}
                      onChange={(event) => {
                        setCommentDrafts((drafts) => ({
                          ...drafts,
                          [task.id]: event.target.value,
                        }));
                      }}
                      onBlur={(event) => {
                        updateTask(task.id, {
                          workerComment: event.target.value.trim() || undefined,
                        });
                      }}
                    />
                    
                    <button 
                      onClick={() => handleStatusChange(task.id, TaskStatus.DONE)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors mt-1"
                    >
                      סיום משימה
                    </button>
                    <div className="mt-1">
                      <button 
                         onClick={() => handleStatusChange(task.id, TaskStatus.IMPOSSIBLE)}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        דווח בעיה
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {teamTasks.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase">
            אין משימות משויכות לצוות זה להיום
          </div>
        )}
      </div>
    </div>
  );
}
