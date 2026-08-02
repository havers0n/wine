import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Printer, Users } from 'lucide-react';
import { compareDisplayDates } from '../lib/dateUtils';
import { usePlanning } from '../store/PlanningContext';
import { PlanItem } from '../types';

const ALL = 'all';
const UNASSIGNED_TEAM = 'ללא שיוך';

interface WeeklyPlanPrintProps {
  onBack: () => void;
}

interface DetailGroup {
  date: string;
  team: string;
  items: PlanItem[];
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

function formatHebrewDate(value: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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

function PageFooter({ generatedAt }: { generatedAt: Date }) {
  return (
    <footer className="weekly-print-footer">
      <span>MAGOF Planner • הופק בתאריך {generationTime(generatedAt)}</span>
      <span>תכנון שבועי לצוותי הדיגום</span>
    </footer>
  );
}

export default function WeeklyPlanPrint({ onBack }: WeeklyPlanPrintProps) {
  const { planItems, access } = usePlanning();
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

  const unassignedCount = visibleItems.filter((item) => !item.team.trim()).length;
  const maxDayItems = Math.max(1, ...visibleDates.map((date) => (
    visibleItems.filter((item) => item.date === date).length
  )));
  const periodLabel = visibleDates.length === 0
    ? 'ללא תאריכים'
    : visibleDates.length === 1
      ? visibleDates[0]
      : `${visibleDates[0]} - ${visibleDates[visibleDates.length - 1]}`;

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = `MAGOF-${visibleDates[0] ?? 'weekly-plan'}`;
    window.print();
    document.title = previousTitle;
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
            <p className="text-xs text-slate-500">בחלון ההדפסה יש לבחור שמירה כ-PDF ובפריסה לרוחב.</p>
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
            onClick={handlePrint}
            disabled={visibleItems.length === 0}
            className="weekly-print-primary-button"
          >
            <Printer className="w-4 h-4" /> הדפס / שמור כ-PDF
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
                <h1>תוכנית עבודה שבועית</h1>
                <p className="weekly-print-period">{periodLabel}</p>
              </div>
              <PrintLogo />
            </header>

            <div className="weekly-kpi-grid">
              <div><strong>{visibleItems.length}</strong><span>נקודות עבודה</span></div>
              <div><strong>{samplesFor(visibleItems)}</strong><span>דגימות מתוכננות</span></div>
              <div><strong>{visibleTeams.length}</strong><span>צוותים</span></div>
              <div><strong>{visibleDates.length}</strong><span>ימי עבודה</span></div>
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
                        <span>{date}</span>
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
                  <div><h2>עומס לפי צוות</h2><p>סיכום נקודות לכל התקופה</p></div>
                </div>
                <div className="weekly-team-totals">
                  {visibleTeams.map((team) => {
                    const teamItems = visibleItems.filter((item) => teamName(item) === team);
                    return (
                      <div key={team}>
                        <span>{team}</span>
                        <strong>{teamItems.length} נק׳</strong>
                        <small>{samplesFor(teamItems)} דגימות</small>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="weekly-matrix-section">
              <h2>חלוקה בין צוותים וימים</h2>
              <table className="weekly-matrix-table">
                <thead>
                  <tr>
                    <th>צוות</th>
                    {visibleDates.map((date) => <th key={date}>{date}</th>)}
                    <th>סה״כ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeams.map((team) => {
                    const total = visibleItems.filter((item) => teamName(item) === team).length;
                    return (
                      <tr key={team}>
                        <th>{team}</th>
                        {visibleDates.map((date) => (
                          <td key={date}>{visibleItems.filter((item) => item.date === date && teamName(item) === team).length || '—'}</td>
                        ))}
                        <td><strong>{total}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <PageFooter generatedAt={generatedAt} />
          </section>

          {detailGroups.map((group) => (
            <section key={`${group.date}-${group.team}`} className="weekly-print-page weekly-detail-page">
              <header className="weekly-detail-header">
                <div>
                  <p className="weekly-print-eyebrow">MAGOF PLANNER</p>
                  <h1>תוכנית עבודה שבועית</h1>
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
                  <div><dt>נקודות</dt><dd>{group.items.length}</dd></div>
                  <div><dt>דגימות</dt><dd>{samplesFor(group.items)}</dd></div>
                  <div>
                    <dt>אזורים</dt>
                    <dd>{new Set(group.items.map((item) => item.sector.trim()).filter(Boolean)).size}</dd>
                  </div>
                </dl>
              </section>

              <table className="weekly-detail-table">
                <thead>
                  <tr>
                    <th className="weekly-col-index">#</th>
                    <th>קוד חלקה</th>
                    <th>מגדל / משק</th>
                    <th>שם החלקה</th>
                    <th>אזור</th>
                    <th>זן</th>
                    <th className="weekly-col-samples">דגימות</th>
                    <th className="weekly-col-note">הערת המתאם</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="weekly-row-index">{index + 1}</td>
                      <td><strong>{item.plotCode || '—'}</strong></td>
                      <td>{item.farm || '—'}</td>
                      <td>
                        <strong>{item.plotName}</strong>
                        {item.vineyard && <small>{item.vineyard}</small>}
                      </td>
                      <td>{item.sector || '—'}</td>
                      <td>{item.variety || '—'}</td>
                      <td className="weekly-samples-cell">{item.plannedSamples || '—'}</td>
                      <td className="weekly-note-cell">{item.coordinatorNote || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <PageFooter generatedAt={generatedAt} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
