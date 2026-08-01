import React, { useMemo, useState } from 'react';
import { usePlanning } from '../store/PlanningContext';
import { PlanItemStatus } from '../types';
import { CalendarDays, ChevronLeft, FileText, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { compareDisplayDates } from '../lib/dateUtils';

const statusStyles: Record<PlanItemStatus, string> = {
  [PlanItemStatus.PLANNED]: 'bg-slate-100 text-slate-600',
  [PlanItemStatus.ASSIGNED]: 'bg-emerald-100 text-emerald-700',
  [PlanItemStatus.DEFERRED]: 'bg-amber-100 text-amber-700',
  [PlanItemStatus.CANCELLED]: 'bg-rose-100 text-rose-700',
};

export default function WorkerPage() {
  const { planItems } = usePlanning();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const teams = useMemo(() => {
    const uniqueTeams = Array.from(new Set(planItems.map((item) => item.team))).filter(Boolean);
    return uniqueTeams.sort();
  }, [planItems]);

  const teamDates = useMemo(() => {
    const dates = new Set(
      planItems.filter((item) => item.team === selectedTeam).map((item) => item.date),
    );
    return Array.from(dates).filter(Boolean).sort(compareDisplayDates);
  }, [planItems, selectedTeam]);

  const activeDate = selectedDate || teamDates[0] || '';

  const teamItems = useMemo(
    () => planItems.filter((item) => item.team === selectedTeam && item.date === activeDate),
    [planItems, selectedTeam, activeDate],
  );

  if (!selectedTeam) {
    return (
      <div className="max-w-md mx-auto p-4 py-12 animate-in fade-in flex flex-col items-center" dir="rtl">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
          <CalendarDays className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2 text-center uppercase tracking-tight">בחר את הצוות שלך</h2>
        <p className="text-sm text-slate-500 mb-6 text-center">צפה בתוכנית העבודה שהוכנה לצוות.</p>
        {teams.length === 0 ? (
          <p className="text-center text-slate-500 text-sm font-bold uppercase">אין צוותים משויכים בתוכנית כרגע</p>
        ) : (
          <div className="grid gap-3 w-full">
            {teams.map((team) => (
              <button
                key={team}
                type="button"
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

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col" dir="rtl">
      <div className="pt-6 px-4 pb-4 bg-emerald-700 text-white shrink-0 shadow-sm relative">
        <button
          type="button"
          onClick={() => {
            setSelectedTeam('');
            setSelectedDate('');
            setActiveItem(null);
          }}
          className="absolute top-4 left-4 text-[10px] text-white/80 font-bold uppercase tracking-widest px-2 py-1 bg-black/10 rounded"
        >
          החלף צוות
        </button>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{activeDate} • {teamItems.length} נקודות</h2>
        <div className="text-lg font-black uppercase tracking-tight">תוכנית צוות {selectedTeam}</div>
        <p className="text-[11px] text-white/75 mt-1">מידע לתכנון היום. ביצוע הדיגום מתועד ב-AKOLogic.</p>
        {teamDates.length > 1 && (
          <div className="flex gap-1 mt-4 overflow-x-auto" aria-label="בחירת יום עבודה">
            {teamDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setActiveItem(null);
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
      </div>

      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {teamItems.map((item) => {
          const isExpanded = activeItem === item.id;
          return (
            <article
              key={item.id}
              className={cn(
                'bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden',
                'border-slate-200',
                isExpanded && 'ring-2 ring-emerald-500 border-emerald-500',
              )}
            >
              <button
                type="button"
                className="p-4 cursor-pointer text-right w-full"
                onClick={() => setActiveItem(isExpanded ? null : item.id)}
                aria-expanded={isExpanded}
              >
                <div className="flex justify-between items-start mb-2 gap-3">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter truncate">
                    {item.farm}
                  </span>
                  <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0', statusStyles[item.status])}>
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-black text-lg text-slate-900 leading-tight mb-1">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {item.sector || `חלקה ${item.plotCode}`}
                </div>
                <div className="text-xs text-slate-700 font-bold">{item.plotName}</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
                  חלקה {item.plotCode} • {item.variety || 'זן לא צוין'} • {item.plannedSamples || '—'} דגימות
                </div>

                {item.coordinatorNote && !isExpanded && (
                  <div className="mt-2 text-[10px] text-amber-700 font-bold truncate flex items-center gap-1">
                    <FileText className="w-3 h-3" /> הערת תכנון: {item.coordinatorNote}
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 space-y-3">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                    <div>
                      <dt className="text-slate-400 font-bold">כרם</dt>
                      <dd className="text-slate-800 font-medium">{item.vineyard || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-bold">אגרונום</dt>
                      <dd className="text-slate-800 font-medium">{item.agronomist || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-bold">סוג דגימה</dt>
                      <dd className="text-slate-800 font-medium">{item.sampleType || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-bold">שנת נטיעה</dt>
                      <dd className="text-slate-800 font-medium">{item.plantingYear || '—'}</dd>
                    </div>
                  </dl>

                  {item.coordinatorNote && (
                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded text-[10px] text-amber-900">
                      <span className="font-black block mb-0.5 uppercase">הערת תכנון:</span>
                      {item.coordinatorNote}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {teamItems.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase">
            אין נקודות בתוכנית של הצוות ליום זה
          </div>
        )}
      </div>
    </div>
  );
}
