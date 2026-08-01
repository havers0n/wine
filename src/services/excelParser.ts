import * as XLSX from 'xlsx';
import { formatDisplayDate } from '../lib/dateUtils';
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
  droppedRows: number;
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
  const source = parts.join('|');
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `plan-item-${(hash >>> 0).toString(36)}`;
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

  const planItems = rows.flatMap<PlanItem>((row, index) => {
    const date = formatExcelDate(row['תאריך']);
    const plotName = asText(row['שם חלקה']);
    if (!date || !plotName) return [];

    const plotCode = asText(row['קוד/ שם במשק']);
    const team = asText(row['צוות דיגום']);

    return [{
      id: stablePlanItemId([date, plotCode, plotName, team, String(index + 2)]),
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
      plannedSamples: asText(row['מספר דגימות']),
      sector: asText(row['הערה']),
      sampleType: asText(row['סוג דגימה']),
      color: asText(row['צבע']),
      status: team ? PlanItemStatus.ASSIGNED : PlanItemStatus.PLANNED,
    }];
  });

  if (planItems.length === 0) {
    throw new ExcelImportError('לא נמצאו שורות עם תאריך ושם חלקה תקינים');
  }

  return {
    planItems,
    droppedRows: rows.length - planItems.length,
  };
}
