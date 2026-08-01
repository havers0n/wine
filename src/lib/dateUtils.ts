const DISPLAY_DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export function formatDisplayDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

export function displayDateToTimestamp(value: string): number {
  const match = DISPLAY_DATE_PATTERN.exec(value);
  if (!match) return Number.POSITIVE_INFINITY;

  const [, day, month, year] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export function compareDisplayDates(left: string, right: string): number {
  return displayDateToTimestamp(left) - displayDateToTimestamp(right);
}
