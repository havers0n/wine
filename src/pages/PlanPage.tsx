import React, { useMemo, useState } from 'react';
import { useTasks } from '../store/TaskContext';
import { Task, TaskStatus } from '../types';
import { Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PlanPage() {
  const { tasks } = useTasks();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const dates = useMemo(() => {
    const uniqueDates = Array.from(new Set(tasks.map(t => t.date))).filter(Boolean);
    return uniqueDates.sort();
  }, [tasks]);

  const activeDate = selectedDate || (dates.length > 0 ? dates[0] : '');

  const filteredTasks = useMemo(() => {
    let ft = tasks.filter(t => t.date === activeDate);
    if (selectedTeam !== 'all') {
      ft = ft.filter(t => t.team === selectedTeam);
    }
    return ft;
  }, [tasks, activeDate, selectedTeam]);

  const allTeams = useMemo(() => {
    const teams = Array.from(new Set(tasks.filter(t => t.date === activeDate).map(t => t.team || 'ללא שיוך')));
    return teams.sort();
  }, [tasks, activeDate]);

  // Aggregate stats for the current date
  const dateTasks = tasks.filter(t => t.date === activeDate);
  const totalDateTasks = dateTasks.length;
  const completedDateTasks = dateTasks.filter(t => t.status === TaskStatus.DONE).length;
  
  const statsByTeam = useMemo(() => {
    const stats: Record<string, { total: number, done: number, problems: number }> = {};
    allTeams.forEach(team => {
      stats[team] = { total: 0, done: 0, problems: 0 };
    });
    dateTasks.forEach(task => {
      const team = task.team || 'ללא שיוך';
      if (stats[team]) {
         stats[team].total += 1;
         if (task.status === TaskStatus.DONE) stats[team].done += 1;
         if (task.status === TaskStatus.IMPOSSIBLE) stats[team].problems += 1;
      }
    });
    return stats;
  }, [dateTasks, allTeams]);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return <span className="inline-block w-20 px-2 py-1 rounded text-[10px] font-black text-center bg-emerald-100 text-emerald-700 uppercase">בוצע</span>;
      case TaskStatus.IN_PROGRESS: return <span className="inline-block w-20 px-2 py-1 rounded text-[10px] font-black text-center bg-amber-100 text-amber-700 uppercase">בעבודה</span>;
      case TaskStatus.IMPOSSIBLE: return <span className="inline-block w-20 px-2 py-1 rounded text-[10px] font-black text-center bg-rose-100 text-rose-700 uppercase">תקלה</span>;
      case TaskStatus.NEEDS_CHECK: return <span className="inline-block w-20 px-2 py-1 rounded text-[10px] font-black text-center bg-purple-100 text-purple-700 uppercase">לבדוק</span>;
      default: return <span className="inline-block w-20 px-2 py-1 rounded text-[10px] font-black text-center bg-slate-100 text-slate-400 uppercase">שויך</span>;
    }
  };

  const getVarietyBadge = (variety: string) => {
    // Just a simple hash to pick a color for variety
    const colors = [
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700'
    ];
    let hash = 0;
    for (let i = 0; i < variety.length; i++) hash = variety.charCodeAt(i) + ((hash << 5) - hash);
    const colorClass = colors[Math.abs(hash) % colors.length];
    return <span className={cn("px-2 py-0.5 rounded font-bold text-[10px] uppercase", colorClass)}>{variety}</span>;
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in" dir="rtl">
        <div className="bg-slate-50 p-6 rounded-full text-slate-400">
          <Calendar className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700">אין נתונים</h2>
        <p className="text-slate-500">אנא העלה קובץ אקסל דרך מסך ההעלאה.</p>
      </div>
    );
  }

  // Top 3 teams for summary cards
  const topTeams = Object.entries(statsByTeam).sort((a,b) => b[1].total - a[1].total).slice(0, 3);

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      
      {/* Date Tabs (Instead of full page header) */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1 shadow-sm shrink-0 self-start">
        {dates.map(date => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={cn(
              "px-3 py-1 rounded text-xs font-bold transition-colors uppercase",
              activeDate === date 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {date}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {topTeams.map(([team, stats]) => {
           const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
           return (
             <div key={team} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">צוות {team}</p>
               <div className="flex items-end justify-between">
                 <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
                 {stats.problems > 0 ? (
                   <span className="text-[10px] font-bold text-rose-600 px-2 py-0.5 bg-rose-50 rounded">{stats.problems} תקלות</span>
                 ) : (
                   <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", stats.done > 0 ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50")}>
                     {stats.done} בוצע
                   </span>
                 )}
               </div>
               <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                 <div className="bg-emerald-500 h-full transition-all" style={{ width: `${percent}%` }}></div>
               </div>
             </div>
           );
        })}
        
        {/* Total Stats Card */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
          <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">סה״כ משימות</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-900">{totalDateTasks}</span>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-emerald-700">התקדמות {totalDateTasks > 0 ? Math.round((completedDateTasks / totalDateTasks) * 100) : 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 flex-wrap gap-4">
          <div className="flex gap-4">
             <select 
               className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold outline-none text-slate-700"
               value={selectedTeam}
               onChange={(e) => setSelectedTeam(e.target.value)}
             >
               <option value="all">כל הצוותים</option>
               {allTeams.map(t => <option key={t} value={t}>צוות: {t}</option>)}
             </select>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
            נמצאו {filteredTasks.length} שורות
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-black">
                <th className="p-3 pr-6">קוד חלקה</th>
                <th className="p-3">שם חלקה / משק</th>
                <th className="p-3">זן</th>
                <th className="p-3 text-center">שטח</th>
                <th className="p-3 text-center">צוות</th>
                <th className="p-3 text-center">דגימות</th>
                <th className="p-3 text-left pl-6">סטטוס</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredTasks.map(task => (
                <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50 group transition-colors">
                  <td className="p-3 pr-6 text-xs">
                    <div className="font-mono font-bold text-emerald-700">#{task.plotCode}</div>
                    <div className="text-[10px] text-slate-400 font-normal uppercase">קוד חלקה</div>
                  </td>
                  <td className="p-3 font-medium text-xs">
                    <div className="text-slate-900">{task.farm}</div>
                    <div className="text-slate-500 font-normal">{task.plotName}</div>
                  </td>
                  <td className="p-3">
                    {getVarietyBadge(task.variety)}
                  </td>
                  <td className="p-3 text-slate-500 text-center text-xs">{task.area} ד׳</td>
                  <td className="p-3 text-slate-500 text-center text-xs font-bold">{task.team || '-'}</td>
                  <td className="p-3 text-center font-bold text-xs">{task.samplesCount}</td>
                  <td className="p-3 text-left pl-6">
                    {getStatusBadge(task.status)}
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium text-sm">
                    לא נמצאו משימות מתאימות
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
