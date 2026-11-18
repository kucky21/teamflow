import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

export function formatDate(value: string | Date | null | undefined, pattern = 'd. M. yyyy'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? format(date, pattern, { locale: cs }) : '—';
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "d. M. yyyy 'v' H:mm");
}

export function formatRelative(value: string): string {
  const date = parseISO(value);
  if (!isValid(date)) return '';
  if (Math.abs(Date.now() - date.getTime()) < 45_000) return 'právě teď';
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: cs });
}

/** Dnešní datum v místním čase ve formátu YYYY-MM-DD. */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later';

export function dueState(dueDate: string | null, done: boolean): DueState | null {
  if (!dueDate || done) return null;
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'later';
}

export function formatDue(dueDate: string): string {
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (diff === 0) return 'Dnes';
  if (diff === 1) return 'Zítra';
  if (diff === -1) return 'Včera';
  return formatDate(dueDate, diff > -300 && diff < 300 ? 'd. M.' : 'd. M. yyyy');
}

export function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
