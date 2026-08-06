import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Printer, Users } from 'lucide-react';
import { compareDisplayDates } from '../lib/dateUtils';
import { usePlanning } from '../store/PlanningContext';
import { PlanItem } from '../types';

const ALL = 'all';
const UNASSIGNED_TEAM = 'ללא שיוך';
const MAX_DETAIL_ROWS_PER_PAGE = 8;

interface WeeklyPlanPrintProps {
  onBack: () => void;
}

interface DetailGroup {
  date: string;
  team: string;
  items: PlanItem[];
}

interface DetailPage extends DetailGroup {
  allItems: PlanItem[];
  startIndex: number;
  pageNumber: number;
}

function samplesFor(items: PlanItem[]): number {
  return items.reduce((total, item) => {
    const value = Number.parseInt(item.plannedSamples, 10);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function teamName(item: PlanItem): string {
  return item.team.trim() || UNASSIGNED_TEAM;
}

function safeFilenamePart(value: string): string {
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();

  return sanitized || 'team';
}

function parseDisplayDate(value: string): Date | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function formatHebrewDate(value: string): string {
  const date = parseDisplayDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatHebrewPeriod(dates: string[]): string {
  if (dates.length === 0) return 'ללא תאריכים';

  const first = parseDisplayDate(dates[0]);
  const last = parseDisplayDate(dates[dates.length - 1]);
  if (!first || !last) return dates.length === 1 ? dates[0] : `${dates[0]} עד ${dates[dates.length - 1]}`;

  if (first.getTime() === last.getTime()) {
    return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(first);
  }

  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    const month = new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(first);
    return `${first.getDate()} עד ${last.getDate()} ב${month} ${first.getFullYear()}`;
  }

  const formatter = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${formatter.format(first)} עד ${formatter.format(last)}`;
}

function generationTime(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function PrintLogo() {
  return (
    <div className="weekly-print-logo" aria-label="MAGOF">
      <img src="/magof-logo.png" alt="MAGOF" />
    </div>
  );
}

function PageFooter({ generatedAt, pageNumber, pageCount }: { generatedAt: Date; pageNumber: number; pageCount: number }) {
  return (
    <footer className="weekly-print-footer">
      <span>MAGOF Planner • הופק בתאריך {generationTime(generatedAt)}</span>
      <strong>עמוד {pageNumber} מתוך {pageCount}</strong>
    </footer>
  );
}

export default function WeeklyPlanPrint({ onBack }: WeeklyPlanPrintProps) {
  const { planItems } = usePlanning();
  const [dateFilter, setDateFilter] = useState(ALL);
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [generatedAt] = useState(() => new Date());

  const dates = useMemo(() => (
    Array.from(new Set(planItems.map((item) => item.date).filter(Boolean))).sort(compareDisplayDates)
  ), [planItems]);

  const teams = useMemo(() => (
    Array.from(new Set(planItems.map(teamName))).sort((left, right) => {
      if (left === UNASSIGNED_TEAM) return 1;
      if (right === UNASSIGNED_TEAM) return -1;
      return left.localeCompare(right, 'he');
    })
  ), [planItems]);

  const visibleItems = useMemo(() => planItems.filter((item) => (
    (dateFilter === ALL || item.date === dateFilter)
    && (teamFilter === ALL || teamName(item) === teamFilter)
  )), [dateFilter, planItems, teamFilter]);

  const visibleDates = useMemo(() => (
    Array.from(new Set(visibleItems.map((item) => item.date))).sort(compareDisplayDates)
  ), [visibleItems]);

  const visibleTeams = useMemo(() => (
    teams.filter((team) => visibleItems.some((item) => teamName(item) === team))
  ), [teams, visibleItems]);

  const detailGroups = useMemo<DetailGroup[]>(() => {
    const groups: DetailGroup[] = [];
    visibleDates.forEach((date) => {
      visibleTeams.forEach((team) => {
        const items = visibleItems.filter((item) => item.date === date && teamName(item) === team);
        if (items.length > 0) groups.push({ date, team, items });
      });
    });
    return groups;
  }, [visibleDates, visibleItems, visibleTeams]);

  const detailPages = useMemo<DetailPage[]>(() => detailGroups.flatMap((group) => {
    const pageCount = Math.ceil(group.items.length / MAX_DETAIL_ROWS_PER_PAGE);
    const basePageSize = Math.floor(group.items.length / pageCount);
    const fullerPageCount = group.items.length % pageCount;
    let startIndex = 0;

    return Array.from({ length: pageCount }, (_, pageIndex) => {
      const pageSize = basePageSize + (pageIndex < fullerPageCount ? 1 : 0);
      const pageStartIndex = startIndex;
      startIndex += pageSize;
      return {
        date: group.date,
        team: group.team,
        items: group.items.slice(pageStartIndex, pageStartIndex + pageSize),
        allItems: group.items,
        startIndex: pageStartIndex,
        pageNumber: pageIndex + 1,
      };
    });
  }), [detailGroups]);

  const unassignedCount = visibleItems.filter((item) => !item.team.trim()).length;
  const maxDayItems = Math.max(1, ...visibleDates.map((date) => (
    visibleItems.filter((item) => item.date === date).length
  )));
  const periodLabel = formatHebrewPeriod(visibleDates);
  const reportRegion = visibleTeams.length === 1 ? visibleTeams[0] : `${visibleTeams.length} צוותים`;
  const reportTitle = visibleTeams.length === 1
    ? `תוכנית עבודה - צוות ${reportRegion}`
    : `תוכנית עבודה - ${reportRegion}`;
  const repeatedSamplePoints = visibleItems.filter((item) => Number.parseInt(item.plannedSamples, 10) > 1).length;
  const notesCount = visibleItems.filter((item) => item.coordinatorNote?.trim()).length;
  const averagePointsPerDay = visibleDates.length > 0 ? visibleItems.length / visibleDates.length : 0;
  const busiestDate = visibleDates.reduce((busiest, date) => {
    const count = visibleItems.filter((item) => item.date === date).length;
    return count > busiest.count ? { date, count } : busiest;
  }, { date: '', count: 0 });
  const totalPages = detailPages.length + 1;

  const handlePrint = async () => {
    if (visibleItems.length === 0) return;
    await document.fonts.ready;
    const originalTitle = document.title;
    const datePart = (visibleDates[0] ?? 'weekly-plan').replaceAll('.', '-');
    document.title = `${safeFilenamePart(reportRegion)}-${datePart}`;
    window.addEventListener('afterprint', () => { document.title = originalTitle; }, { once: true });
    window.print();
  };

  return (
    <div className="weekly-print-preview" dir="rtl">
      <div className="weekly-print-toolbar print-hidden">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="weekly-print-secondary-button">
            <ArrowRight className="w-4 h-4" /> חזרה לתכנון
          </button>
          <div>
            <h2 className="font-black text-slate-900">תצוגה מקדימה להדפסה</h2>
            <p className="text-xs text-slate-500">הדפסה או שמירה כ-PDF עם טקסט חד, ניתן לחיפוש ולהעתקה.</p>
          </div>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <label className="weekly-print-filter">
            <span>יום</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value={ALL}>כל השבוע</option>
              {dates.map((date) => <option key={date} value={date}>{date}</option>)}
            </select>
          </label>
          <label className="weekly-print-filter">
            <span>צוות</span>
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
              <option value={ALL}>כל הצוותים</option>
              {teams.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={visibleItems.length === 0}
            className="weekly-print-primary-button"
          >
            <Printer className="w-4 h-4" /> הדפסה / שמירה כ-PDF
          </button>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="weekly-print-empty print-hidden">אין נתונים התואמים לסינון שנבחר.</div>
      ) : (
        <div className="weekly-print-document">
          <section className="weekly-print-page weekly-summary-page">
            <header className="weekly-summary-header">
              <div>
                <p className="weekly-print-eyebrow">MAGOF PLANNER</p>
                <h1>{reportTitle}</h1>
                <p className="weekly-print-period">{periodLabel}</p>
              </div>
              <PrintLogo />
            </header>

            <div className="weekly-kpi-grid">
              <div><strong>{visibleItems.length}</strong><span>נקודות עבודה ייחודיות</span></div>
              <div><strong>{samplesFor(visibleItems)}</strong><span>סה״כ דגימות</span><small>כולל דגימות חוזרות באותה חלקה</small></div>
              <div><strong>{new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(averagePointsPerDay)}</strong><span>ממוצע נקודות ליום</span></div>
              <div><strong>{busiestDate.count}</strong><span>היום העמוס ביותר • {busiestDate.date}</span></div>
            </div>

            {unassignedCount > 0 && (
              <div className="weekly-unassigned-warning">
                <strong>{unassignedCount}</strong> נקודות עדיין לא משויכות לצוות
              </div>
            )}

            <div className="weekly-summary-columns">
              <section>
                <div className="weekly-section-title">
                  <CalendarDays />
                  <div><h2>חלוקת העבודה לפי ימים</h2><p>מספר נקודות מתוכננות בכל יום</p></div>
                </div>
                <div className="weekly-day-bars">
                  {visibleDates.map((date) => {
                    const count = visibleItems.filter((item) => item.date === date).length;
                    return (
                      <div key={date} className="weekly-day-bar-row">
                        <span>{formatHebrewPeriod([date])}</span>
                        <div><i style={{ width: `${Math.max(6, (count / maxDayItems) * 100)}%` }} /></div>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="weekly-section-title">
                  <Users />
                  <div><h2>דגשים לביצוע</h2><p>חריגים ונתונים שכדאי להכיר לפני היציאה</p></div>
                </div>
                <div className="weekly-operational-highlights">
                  <div><span>חלקות עם מספר דגימות</span><strong>{repeatedSamplePoints}</strong></div>
                  <div><span>הערות לביצוע</span><strong>{notesCount}</strong></div>
                  <div><span>ימי עבודה</span><strong>{visibleDates.length}</strong></div>
                  <div><span>צוותים בדוח</span><strong>{visibleTeams.length}</strong></div>
                </div>
              </section>
            </div>

            <PageFooter generatedAt={generatedAt} pageNumber={1} pageCount={totalPages} />
          </section>

          {detailPages.map((group, detailPageIndex) => {
            const showNotes = group.items.some((item) => item.coordinatorNote?.trim());
            return (
              <section key={`${group.date}-${group.team}-${group.pageNumber}`} className="weekly-print-page weekly-detail-page">
                <header className="weekly-detail-header">
                  <div>
                    <p className="weekly-print-eyebrow">MAGOF PLANNER</p>
                    <h1>תוכנית עבודה - צוות {group.team}</h1>
                    <p>{periodLabel}</p>
                  </div>
                  <PrintLogo />
                </header>

                <section className="weekly-team-card" aria-label={`סיכום צוות ${group.team}`}>
                  <div className="weekly-team-card-title">
                    <span>צוות עבודה</span>
                    <h2>צוות {group.team}</h2>
                  </div>
                  <dl>
                    <div><dt>תאריך</dt><dd>{formatHebrewDate(group.date)}</dd></div>
                    <div><dt>נקודות</dt><dd>{group.allItems.length}</dd></div>
                    <div><dt>דגימות</dt><dd>{samplesFor(group.allItems)}</dd></div>
                    <div>
                      <dt>אזורים</dt>
                      <dd>{new Set(group.allItems.map((item) => item.sector.trim()).filter(Boolean)).size}</dd>
                    </div>
                  </dl>
                </section>

                <table className="weekly-detail-table">
                  <thead>
                    <tr>
                      <th className="weekly-col-index">סדר ביצוע</th>
                      <th className="weekly-col-location">משק / חלקה</th>
                      <th className="weekly-col-code">קוד חלקה</th>
                      <th>אזור</th>
                      <th>זן</th>
                      <th className="weekly-col-samples">מס׳ דגימות</th>
                      {showNotes && <th className="weekly-col-note">הערות לביצוע</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="weekly-row-index">{group.startIndex + index + 1}</td>
                        <td>
                          <strong>{item.plotName}</strong>
                          {(item.farm || item.vineyard) && <small>{[item.farm, item.vineyard].filter(Boolean).join(' • ')}</small>}
                        </td>
                        <td className="weekly-code-cell">{item.plotCode || '—'}</td>
                        <td>{item.sector || '—'}</td>
                        <td>{item.variety || '—'}</td>
                        <td className="weekly-samples-cell">{item.plannedSamples || '—'}</td>
                        {showNotes && <td className="weekly-note-cell">{item.coordinatorNote || ''}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <PageFooter generatedAt={generatedAt} pageNumber={detailPageIndex + 2} pageCount={totalPages} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
