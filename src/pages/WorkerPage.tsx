import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  FileText,
  MapPin,
  RefreshCw,
  Users,
} from 'lucide-react';
import { compareDisplayDates, formatDisplayDate } from '../lib/dateUtils';
import { cn } from '../lib/utils';
import { usePlanning } from '../store/PlanningContext';
import { PlanItem, PlanItemStatus, WorkPlanStatus } from '../types';

const statusStyles: Record<PlanItemStatus, string> = {
  [PlanItemStatus.PLANNED]: 'bg-slate-100 text-slate-600',
  [PlanItemStatus.ASSIGNED]: 'bg-emerald-100 text-emerald-700',
  [PlanItemStatus.DEFERRED]: 'bg-amber-100 text-amber-700',
  [PlanItemStatus.CANCELLED]: 'bg-rose-100 text-rose-700',
};

function todayDisplayDate(): string {
  const today = new Date();
  return formatDisplayDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function parseSamples(item: PlanItem): number {
  const value = Number.parseInt(item.plannedSamples, 10);
  return Number.isFinite(value) ? value : 0;
}

export default function WorkerPage() {
  const { planItems, access, isLoading, refreshPlanItems } = usePlanning();
  const isCoordinatorPreview = access?.role === 'coordinator';
  const assignedTeam = access?.role === 'team' ? access.teamName : null;
  const [previewTeam, setPreviewTeam] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const teams = useMemo(() => (
    Array.from(new Set(planItems.map((item) => item.team.trim()).filter(Boolean))).sort()
  ), [planItems]);

  const activeTeam = isCoordinatorPreview ? previewTeam : assignedTeam ?? '';
  const teamDates = useMemo(() => (
    Array.from(new Set(
      planItems
        .filter((item) => item.team === activeTeam)
        .map((item) => item.date)
        .filter(Boolean),
    )).sort(compareDisplayDates)
  ), [activeTeam, planItems]);

  const defaultDate = teamDates.includes(todayDisplayDate()) ? todayDisplayDate() : teamDates[0] ?? '';
  const activeDate = teamDates.includes(selectedDate) ? selectedDate : defaultDate;
  const teamItems = useMemo(() => (
    planItems.filter((item) => item.team === activeTeam && item.date === activeDate)
  ), [activeDate, activeTeam, planItems]);

  const itemsByArea = useMemo(() => {
    const groups = new Map<string, PlanItem[]>();
    teamItems.forEach((item) => {
      const area = item.sector.trim() || 'ללא אזור';
      groups.set(area, [...(groups.get(area) ?? []), item]);
    });
    return Array.from(groups.entries());
  }, [teamItems]);

  const sampleCount = teamItems.reduce((total, item) => total + parseSamples(item), 0);
  const isPublished = access?.workPlanStatus === WorkPlanStatus.PUBLISHED;

  if (!isCoordinatorPreview && !assignedTeam) {
    return (
      <div className="max-w-md mx-auto p-6 py-16 text-center" dir="rtl">
        <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-5">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">עדיין לא שויכת לצוות</h2>
        <p className="text-sm text-slate-500 mt-2">יש לבקש מהמתאם לשייך את החשבון שלך לצוות עבודה.</p>
      </div>
    );
  }

  if (isCoordinatorPreview && !previewTeam) {
    return (
      <div className="max-w-md mx-auto p-4 py-12 animate-in fade-in flex flex-col items-center" dir="rtl">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
          <CalendarDays className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2 text-center">תצוגה מקדימה לצוות</h2>
        <p className="text-sm text-slate-500 mb-6 text-center">בחר צוות כדי לראות בדיוק את התוכנית היומית שלו.</p>
        {teams.length === 0 ? (
          <p className="text-center text-slate-500 text-sm font-bold">אין צוותים משויכים בתוכנית כרגע</p>
        ) : (
          <div className="grid gap-3 w-full">
            {teams.map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => {
                  setPreviewTeam(team);
                  setSelectedDate('');
                }}
                className="bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-900 p-4 rounded-xl font-bold text-sm transition-all flex justify-between items-center"
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
    <div className="max-w-lg mx-auto min-h-full bg-slate-50 flex flex-col" dir="rtl">
      <header className="bg-emerald-800 text-white px-4 pt-5 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">התוכנית היומית שלי</span>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-black',
                isPublished ? 'bg-white/15 text-white' : 'bg-amber-300 text-amber-950',
              )}>
                {isPublished ? 'פורסם' : 'תצוגת טיוטה'}
              </span>
            </div>
            <h2 className="text-xl font-black truncate">צוות {activeTeam}</h2>
            <p className="text-[11px] text-white/70 mt-0.5">הביצוע והדיווח נשארים ב-AKOLogic</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void refreshPlanItems()}
              disabled={isLoading}
              className="p-2 rounded-lg bg-black/10 hover:bg-black/20 disabled:opacity-50"
              aria-label="רענון תוכנית"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            {isCoordinatorPreview && (
              <button
                type="button"
                onClick={() => {
                  setPreviewTeam('');
                  setSelectedDate('');
                  setActiveItem(null);
                }}
                className="px-2.5 py-2 rounded-lg bg-black/10 hover:bg-black/20 text-[10px] font-bold"
              >
                החלף צוות
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-0.5" aria-label="בחירת יום עבודה">
          {teamDates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => {
                setSelectedDate(date);
                setActiveItem(null);
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[11px] font-bold whitespace-nowrap border',
                date === activeDate
                  ? 'bg-white text-emerald-900 border-white'
                  : 'bg-black/10 text-white/80 border-white/10',
              )}
            >
              {date === todayDisplayDate() ? 'היום' : date}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-lg bg-black/10 py-2">
            <div className="text-lg font-black leading-none">{teamItems.length}</div>
            <div className="text-[9px] text-white/65 mt-1">נקודות</div>
          </div>
          <div className="rounded-lg bg-black/10 py-2">
            <div className="text-lg font-black leading-none">{sampleCount}</div>
            <div className="text-[9px] text-white/65 mt-1">דגימות</div>
          </div>
          <div className="rounded-lg bg-black/10 py-2">
            <div className="text-lg font-black leading-none">{itemsByArea.length}</div>
            <div className="text-[9px] text-white/65 mt-1">אזורים</div>
          </div>
        </div>
      </header>

      <main className="p-3 space-y-5 flex-1">
        {itemsByArea.map(([area, items], areaIndex) => (
          <section key={area} aria-labelledby={`team-area-${areaIndex}`}>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 id={`team-area-${areaIndex}`} className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {area}
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{items.length} נקודות</span>
            </div>

            <div className="space-y-2.5">
              {items.map((item, index) => {
                const isExpanded = activeItem === item.id;
                return (
                  <article
                    key={item.id}
                    className={cn(
                      'bg-white rounded-xl shadow-sm border overflow-hidden transition-colors',
                      isExpanded ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-slate-200',
                    )}
                  >
                    <button
                      type="button"
                      className="p-4 text-right w-full"
                      onClick={() => setActiveItem(isExpanded ? null : item.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-black text-base text-slate-900 truncate">{item.plotName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">{item.farm}</div>
                          </div>
                        </div>
                        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="bg-slate-100 text-slate-700 rounded px-2 py-1">חלקה {item.plotCode}</span>
                        <span className="bg-violet-50 text-violet-700 rounded px-2 py-1">{item.variety || 'זן לא צוין'}</span>
                        <span className={cn('rounded px-2 py-1', statusStyles[item.status])}>{item.status}</span>
                      </div>

                      {item.coordinatorNote && !isExpanded && (
                        <div className="mt-3 text-[10px] text-amber-800 font-bold truncate flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-1.5">
                          <FileText className="w-3 h-3 shrink-0" /> {item.coordinatorNote}
                        </div>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 space-y-3">
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                          <div><dt className="text-slate-400 font-bold">מספר דגימות</dt><dd className="text-slate-900 font-black">{item.plannedSamples || '—'}</dd></div>
                          <div><dt className="text-slate-400 font-bold">כרם</dt><dd className="text-slate-800 font-medium">{item.vineyard || '—'}</dd></div>
                          <div><dt className="text-slate-400 font-bold">אגרונום</dt><dd className="text-slate-800 font-medium">{item.agronomist || '—'}</dd></div>
                          <div><dt className="text-slate-400 font-bold">סוג דגימה</dt><dd className="text-slate-800 font-medium">{item.sampleType || '—'}</dd></div>
                          <div><dt className="text-slate-400 font-bold">שנת נטיעה</dt><dd className="text-slate-800 font-medium">{item.plantingYear || '—'}</dd></div>
                          <div><dt className="text-slate-400 font-bold">שטח</dt><dd className="text-slate-800 font-medium">{item.area || '—'}</dd></div>
                        </dl>

                        {item.coordinatorNote && (
                          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-[11px] text-amber-900">
                            <span className="font-black block mb-1">הערת המתאם</span>
                            {item.coordinatorNote}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {teamItems.length === 0 && (
          <div className="text-center py-14 px-6">
            <CalendarDays className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="mt-3 font-black text-slate-700">אין משימות ליום זה</h3>
            <p className="text-xs text-slate-400 mt-1">אפשר לבחור יום אחר או לרענן את התוכנית.</p>
          </div>
        )}
      </main>
    </div>
  );
}
