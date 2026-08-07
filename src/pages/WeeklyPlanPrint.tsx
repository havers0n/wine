import { useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Download, LoaderCircle, Users } from 'lucide-react';
import { compareDisplayDates } from '../lib/dateUtils';
import { usePlanning } from '../store/PlanningContext';
import type { PlanItem } from '../types';

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

function requiresColorCheck(item: PlanItem): boolean {
  return item.color.trim() === 'כן';
}

function plannedSampleCount(item: PlanItem): number | null {
  const value = Number.parseInt(item.plannedSamples, 10);
  return Number.isFinite(value) ? value : null;
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'));
    reader.readAsDataURL(blob);
  });
}

interface SerializedReport {
  html: string;
  assets: Record<string, string>;
}

async function serializeReport(report: HTMLElement): Promise<SerializedReport> {
  const clone = report.cloneNode(true) as HTMLElement;
  const sourceImages = Array.from(report.querySelectorAll<HTMLImageElement>('img'));
  const clonedImages = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));
  const uniqueSources = Array.from(new Set(
    sourceImages.map((image) => image.currentSrc || image.src).filter(Boolean),
  ));
  const sourceKeys = new Map(uniqueSources.map((source, index) => [source, `image-${index}`]));
  const assets = Object.fromEntries(await Promise.all(uniqueSources.map(async (source) => {
    const key = sourceKeys.get(source);
    if (!key) throw new Error('Unable to identify report image');
    const response = await fetch(source, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Unable to load report image: ${response.status}`);
    return [key, await blobToDataUrl(await response.blob())] as const;
  })));

  clonedImages.forEach((image, index) => {
    const source = sourceImages[index]?.currentSrc || sourceImages[index]?.src;
    const key = source ? sourceKeys.get(source) : undefined;
    if (key) image.setAttribute('src', `report-asset:${key}`);
  });

  return { html: clone.outerHTML, assets };
}

function documentCssText(): string {
  return Array.from(document.styleSheets).flatMap((styleSheet) => {
    try {
      return Array.from(styleSheet.cssRules, (rule) => rule.cssText);
    } catch {
      return [];
    }
  }).join('\n');
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
  const documentRef = useRef<HTMLDivElement>(null);
  const [dateFilter, setDateFilter] = useState(ALL);
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [generatedAt] = useState(() => new Date());
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');

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
  const repeatedSamplePoints = visibleItems.filter((item) => (plannedSampleCount(item) ?? 0) > 1).length;
  const colorCheckPoints = visibleItems.filter(requiresColorCheck).length;
  const averagePointsPerDay = visibleDates.length > 0 ? visibleItems.length / visibleDates.length : 0;
  const busiestDate = visibleDates.reduce((busiest, date) => {
    const count = visibleItems.filter((item) => item.date === date).length;
    return count > busiest.count ? { date, count } : busiest;
  }, { date: '', count: 0 });
  const totalPages = detailPages.length + 1;

  const handleDownload = async () => {
    if (!documentRef.current || visibleItems.length === 0 || exportState === 'generating') return;

    const firstDate = (visibleDates[0] ?? 'weekly-plan').replaceAll('.', '-');
    const lastDate = visibleDates.at(-1)?.replaceAll('.', '-') ?? firstDate;
    const datePart = firstDate === lastDate ? firstDate : `${firstDate}_${lastDate}`;
    const selectedTeam = teamFilter === ALL ? reportRegion : teamFilter;
    const filename = `תוכנית-עבודה-${safeFilenamePart(selectedTeam)}-${datePart}.pdf`;

    setExportState('generating');
    try {
      await document.fonts.ready;
      const report = await serializeReport(documentRef.current);
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: report.html,
          assets: report.assets,
          css: documentCssText(),
          filename,
        }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(details?.error || `PDF export failed (${response.status})`);
      }

      const downloadUrl = URL.createObjectURL(await response.blob());
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10_000);
      setExportState('complete');
      window.setTimeout(() => setExportState('idle'), 4_000);
    } catch (error) {
      console.error('Unable to download weekly plan PDF', error);
      setExportState('error');
    }
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
            <p className="text-xs text-slate-500">לחיצה אחת מורידה PDF חד עם שם הצוות שנבחר.</p>
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
              onClick={() => void handleDownload()}
              disabled={visibleItems.length === 0 || exportState === 'generating'}
              className="weekly-print-primary-button"
            >
              {exportState === 'generating'
                ? <LoaderCircle className="w-4 h-4 animate-spin" />
                : exportState === 'complete'
                  ? <Check className="w-4 h-4" />
                  : <Download className="w-4 h-4" />}
              {exportState === 'generating'
                ? 'מכין PDF…'
                : exportState === 'complete'
                  ? 'ההורדה התחילה'
                  : 'הורדת PDF'}
            </button>
            {exportState === 'error' && (
              <p className="weekly-print-export-error" role="alert">לא הצלחנו להכין את הקובץ. נסו שוב.</p>
            )}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="weekly-print-empty print-hidden">אין נתונים התואמים לסינון שנבחר.</div>
      ) : (
        <div ref={documentRef} className="weekly-print-document">
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
                  <div><span>נקודות עם בדיקת צבע</span><strong>{colorCheckPoints}</strong></div>
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
                      <dt>נקודות עם בדיקת צבע</dt>
                      <dd>{group.allItems.filter(requiresColorCheck).length}</dd>
                    </div>
                  </dl>
                </section>

                <table className="weekly-detail-table">
                  <thead>
                    <tr>
                      <th className="weekly-col-index">סדר ביצוע</th>
                      <th className="weekly-col-location">משק / חלקה</th>
                      <th className="weekly-col-code">קוד חלקה</th>
                      <th className="weekly-col-source-note">פרטים נוספים</th>
                      <th>זן</th>
                      <th className="weekly-col-samples">מס׳ דגימות</th>
                      {showNotes && <th className="weekly-col-note">הערות לביצוע</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, index) => {
                      const sampleCount = plannedSampleCount(item);
                      const hasMultipleSamples = (sampleCount ?? 0) > 1;
                      const hasColorCheck = requiresColorCheck(item);

                      return (
                        <tr key={item.id}>
                          <td className="weekly-row-index">{group.startIndex + index + 1}</td>
                          <td>
                            <strong>{item.plotName}</strong>
                            {(item.farm || item.vineyard) && <small>{[item.farm, item.vineyard].filter(Boolean).join(' • ')}</small>}
                          </td>
                          <td className="weekly-code-cell">{item.plotCode || '—'}</td>
                          <td>{item.sector || '—'}</td>
                          <td>{item.variety || '—'}</td>
                          <td className="weekly-samples-cell">
                            <div className="weekly-row-flags">
                              {hasColorCheck && <span className="weekly-color-check-badge">בדיקת צבע</span>}
                              {hasColorCheck && hasMultipleSamples && <span className="weekly-row-flag-separator">·</span>}
                              <span className={hasMultipleSamples ? 'weekly-sample-value weekly-sample-value-emphasized' : 'weekly-sample-value'}>
                                {sampleCount ?? (item.plannedSamples || '—')}
                              </span>
                            </div>
                          </td>
                          {showNotes && <td className="weekly-note-cell">{item.coordinatorNote || ''}</td>}
                        </tr>
                      );
                    })}
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
