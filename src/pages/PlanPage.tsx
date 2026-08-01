import React, { useMemo, useState } from 'react';
import { usePlanning } from '../store/PlanningContext';
import { PlanItemStatus } from '../types';
import { Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { compareDisplayDates } from '../lib/dateUtils';

interface TeamStats {
  total: number;
  assigned: number;
  exceptions: number;
}

const UNASSIGNED_TEAM = 'ללא שיוך';

export default function PlanPage() {
  const { planItems } = usePlanning();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');

  const dates = useMemo(() => {
    const uniqueDates = Array.from(new Set(planItems.map((item) => item.date))).filter(Boolean);
    return uniqueDates.sort(compareDisplayDates);
  }, [planItems]);

  const activeDate = selectedDate || dates[0] || '';

  const dateItems = useMemo(
    () => planItems.filter((item) => item.date === activeDate),
    [planItems, activeDate],
  );

  const allTeams = useMemo(() => {
    const teams = Array.from(new Set(dateItems.map((item) => item.team || UNASSIGNED_TEAM)));
    return teams.sort();
  }, [dateItems]);

  const filteredItems = useMemo(() => {
    if (selectedTeam === 'all') return dateItems;
    return dateItems.filter((item) => (item.team || UNASSIGNED_TEAM) === selectedTeam);
  }, [dateItems, selectedTeam]);

  const statsByTeam = useMemo(() => {
    const stats: Record<string, TeamStats> = {};
    allTeams.forEach((team) => {
      stats[team] = { total: 0, assigned: 0, exceptions: 0 };
    });
    dateItems.forEach((item) => {
      const team = item.team || UNASSIGNED_TEAM;
      stats[team].total += 1;
      if (item.status === PlanItemStatus.ASSIGNED) stats[team].assigned += 1;
      if (item.status === PlanItemStatus.DEFERRED || item.status === PlanItemStatus.CANCELLED) {
        stats[team].exceptions += 1;
      }
    });
    return stats;
  }, [allTeams, dateItems]);

  const assignedItems = dateItems.filter((item) => item.status === PlanItemStatus.ASSIGNED).length;
  const readiness = dateItems.length > 0 ? Math.round((assignedItems / dateItems.length) * 100) : 0;

  const getStatusBadge = (status: PlanItemStatus) => {
    const base = 'inline-block min-w-20 px-2 py-1 rounded text-[10px] font-black text-center uppercase';
    switch (status) {
      case PlanItemStatus.ASSIGNED:
        return <span className={`${base} bg-emerald-100 text-emerald-700`}>שויך לצוות</span>;
      case PlanItemStatus.DEFERRED:
        return <span className={`${base} bg-amber-100 text-amber-700`}>נדחה</span>;
      case PlanItemStatus.CANCELLED:
        return <span className={`${base} bg-rose-100 text-rose-700`}>בוטל</span>;
      case PlanItemStatus.PLANNED:
        return <span className={`${base} bg-slate-100 text-slate-500`}>מתוכנן</span>;
    }
  };

  const getVarietyBadge = (variety: string) => {
    const colors = [
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
    ];
    let hash = 0;
    for (let index = 0; index < variety.length; index += 1) {
      hash = variety.charCodeAt(index) + ((hash << 5) - hash);
    }
    return (
      <span className={cn('px-2 py-0.5 rounded font-bold text-[10px] uppercase', colors[Math.abs(hash) % colors.length])}>
        {variety || '—'}
      </span>
    );
  };

  if (planItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in" dir="rtl">
        <div className="bg-slate-50 p-6 rounded-full text-slate-400">
          <Calendar className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700">אין תוכנית עבודה</h2>
        <p className="text-slate-500 text-center">ייבא נקודות תכנון מאקסל או הוסף נקודה ידנית.</p>
      </div>
    );
  }

  const teamStats = Object.entries(statsByTeam).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1 shadow-sm shrink-0 self-start overflow-x-auto max-w-full">
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => {
              setSelectedDate(date);
              setSelectedTeam('all');
            }}
            className={cn(
              'px-3 py-1 rounded text-xs font-bold transition-colors uppercase whitespace-nowrap',
              activeDate === date ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {date}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 shrink-0">
        {teamStats.map(([team, stats]) => {
          const assignedPercent = stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0;
          return (
            <div key={team} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{team === UNASSIGNED_TEAM ? team : `צוות ${team}`}</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
                {stats.exceptions > 0 ? (
                  <span className="text-[10px] font-bold text-amber-700 px-2 py-0.5 bg-amber-50 rounded">{stats.exceptions} חריגים</span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded">{stats.assigned} משויכות</span>
                )}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${assignedPercent}%` }} />
              </div>
            </div>
          );
        })}

        <div className="p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
          <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">סה״כ נקודות בתוכנית</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-900">{dateItems.length}</span>
            <div className="text-[10px] uppercase font-bold text-emerald-700">שיבוץ {readiness}%</div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 flex-wrap gap-4">
          <select
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold outline-none text-slate-700"
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
          >
            <option value="all">כל הצוותים</option>
            {allTeams.map((team) => <option key={team} value={team}>{team === UNASSIGNED_TEAM ? team : `צוות: ${team}`}</option>)}
          </select>
          <div className="text-[10px] font-bold text-slate-400 uppercase">נמצאו {filteredItems.length} נקודות</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-black">
                <th className="p-3 pr-6">קוד חלקה</th>
                <th className="p-3">שם חלקה / משק</th>
                <th className="p-3 text-center">מגוף / אזור</th>
                <th className="p-3">זן</th>
                <th className="p-3 text-center">צוות</th>
                <th className="p-3 text-center">דגימות</th>
                <th className="p-3 text-left pl-6">סטטוס</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-3 pr-6 text-xs">
                    <div className="font-mono font-bold text-emerald-700">#{item.plotCode}</div>
                    <div className="text-[10px] text-slate-400 font-normal uppercase">קוד חלקה</div>
                  </td>
                  <td className="p-3 font-medium text-xs">
                    <div className="text-slate-900">{item.farm}</div>
                    <div className="text-slate-500 font-normal">{item.plotName}</div>
                  </td>
                  <td className="p-3 text-center text-xs font-black text-slate-800">{item.sector || '—'}</td>
                  <td className="p-3">{getVarietyBadge(item.variety)}</td>
                  <td className="p-3 text-slate-500 text-center text-xs font-bold">{item.team || '—'}</td>
                  <td className="p-3 text-center font-bold text-xs">{item.plannedSamples || '—'}</td>
                  <td className="p-3 text-left pl-6">{getStatusBadge(item.status)}</td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium text-sm">לא נמצאו נקודות תכנון מתאימות</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
