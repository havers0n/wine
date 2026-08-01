import * as XLSX from 'xlsx';
import { compareDisplayDates, formatDisplayDate } from '../lib/dateUtils';
import { PlanItem, PlanItemStatus } from '../types';

type ExcelRow = Record<string, unknown>;

const REQUIRED_HEADERS = [
  'תאריך',
  'לקוח (מגדל)',
  'שם חלקה',
  'קוד/ שם במשק',
  'צוות דיגום',
] as const;

export interface ExcelParseResult {
  planItems: PlanItem[];
  totalRows: number;
  droppedRows: number;
  dates: string[];
  teams: string[];
}

export class ExcelImportError extends Error {}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function formatExcelDate(rawDate: unknown): string {
  if (rawDate === null || rawDate === undefined || rawDate === '') {
    return '';
  }

  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return formatDisplayDate(
      rawDate.getUTCFullYear(),
      rawDate.getUTCMonth() + 1,
      rawDate.getUTCDate(),
    );
  }

  if (typeof rawDate === 'number' && Number.isFinite(rawDate)) {
    const parsed = XLSX.SSF.parse_date_code(rawDate);
    if (parsed) return formatDisplayDate(parsed.y, parsed.m, parsed.d);
  }

  const value = asText(rawDate);
  if (!value || value.includes('#')) return '';

  const displayDate = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (displayDate) {
    return formatDisplayDate(
      Number(displayDate[3]),
      Number(displayDate[2]),
      Number(displayDate[1]),
    );
  }

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value);
  if (slashDate) {
    const month = Number(slashDate[1]);
    const day = Number(slashDate[2]);
    const rawYear = Number(slashDate[3]);
    const year = rawYear < 100 ? rawYear + 2000 : rawYear;
    return formatDisplayDate(year, month, day);
  }

  return value;
}

function stablePlanItemId(parts: string[]): string {
  const source = parts.join('\u001f');
  let hash = 14695981039346656037n;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }

  return `plan-item-${hash.toString(36)}`;
}

function validateHeaders(rows: ExcelRow[]): void {
  const headers = new Set(Object.keys(rows[0] ?? {}).map((header) => header.trim()));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.has(header));

  if (missingHeaders.length > 0) {
    throw new ExcelImportError(`חסרות עמודות חובה: ${missingHeaders.join(', ')}`);
  }
}

export function parseExcelWorkbook(buffer: ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new ExcelImportError('לא נמצא גיליון בקובץ');

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) throw new ExcelImportError('לא ניתן לקרוא את הגיליון הראשון');

  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    defval: null,
    raw: true,
  });

  if (rows.length === 0) throw new ExcelImportError('הקובץ ריק');
  validateHeaders(rows);

  const duplicateRows: number[] = [];
  const seenIdentityKeys = new Set<string>();

  const planItems = rows.flatMap<PlanItem>((row, index) => {
    const date = formatExcelDate(row['תאריך']);
    const plotName = asText(row['שם חלקה']);
    if (!date || !plotName) return [];

    const plotCode = asText(row['קוד/ שם במשק']);
    const team = asText(row['צוות דיגום']);

    const sector = asText(row['הערה']);
    const sampleType = asText(row['סוג דגימה']);
    const plannedSamples = asText(row['מספר דגימות']);
    const identityParts = [date, plotCode, plotName, sector, sampleType, plannedSamples];
    const identityKey = identityParts.join('\u001f');
    const id = stablePlanItemId(identityParts);

    if (seenIdentityKeys.has(identityKey)) {
      duplicateRows.push(index + 2);
      return [];
    }
    seenIdentityKeys.add(identityKey);

    return [{
      id,
      date,
      farm: asText(row['לקוח (מגדל)']),
      plotName,
      plotCode,
      vineyard: asText(row['כרם']),
      variety: asText(row['זן']),
      plantingYear: asText(row['שנת נטיעה']),
      area: asText(row['שטח']),
      agronomist: asText(row['אגרונום']),
      team,
      plannedSamples,
      sector,
      sampleType,
      color: asText(row['צבע']),
      status: team ? PlanItemStatus.ASSIGNED : PlanItemStatus.PLANNED,
    }];
  });

  if (planItems.length === 0) {
    throw new ExcelImportError('לא נמצאו שורות עם תאריך ושם חלקה תקינים');
  }

  if (duplicateRows.length > 0) {
    throw new ExcelImportError(
      `נמצאו שורות כפולות שלא ניתן לייבא בבטחה: ${duplicateRows.join(', ')}`,
    );
  }

  return {
    planItems,
    totalRows: rows.length,
    droppedRows: rows.length - planItems.length,
    dates: Array.from(new Set(planItems.map((item) => item.date))).sort(compareDisplayDates),
    teams: Array.from(new Set(planItems.map((item) => item.team).filter(Boolean))).sort(),
  };
}
