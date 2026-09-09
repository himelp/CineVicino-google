/**
 * CineVicino — Date and Time Utilities for Italian Cinema Programming
 */
import { Language } from './i18n';

/**
 * Returns today's ISO date string (YYYY-MM-DD) aligned with Europe/Rome timezone.
 */
export function getRomeToday(): string {
  const d = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
}

/**
 * Returns full formatted today string in the active language.
 * e.g. "Mercoledì 9 Settembre 2026" / "Wednesday, September 9, 2026"
 */
export function formatTodayFull(lang: Language): string {
  const now = new Date();
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  const raw = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);

  if (lang === 'it') {
    return raw.split(' ').map((w, idx) => {
      // Capitalize weekday (idx 0) and month (idx 2, e.g. "9 settembre")
      if (idx === 0 || idx === 2) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    }).join(' ');
  }

  return raw;
}

export interface FormattedDatePill {
  dateStr: string;
  mainLabel: string;
  subLabel: string;
  fullAccessibleLabel: string;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) for interactive date picker pills.
 * Shows weekday + day/month (e.g. "Mer 9 Set", "Gio 10 Set") in active language,
 * with today clearly marked as "Oggi" / "Today".
 */
export function formatDatePill(dateStr: string, lang: Language): FormattedDatePill {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const todayStr = getRomeToday();
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;

  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).replace('.', '');
  const dayNum = d.getDate();
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', '');

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const weekdayCap = cap(weekday);
  const monthCap = cap(monthShort);

  const fullAccessible = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(d);

  if (isToday) {
    return {
      dateStr,
      mainLabel: lang === 'it' ? 'Oggi' : 'Today',
      subLabel: `${weekdayCap} ${dayNum} ${monthCap}`,
      fullAccessibleLabel: `${lang === 'it' ? 'Oggi' : 'Today'} (${fullAccessible})`,
      isToday: true,
      isPast: false
    };
  }

  return {
    dateStr,
    mainLabel: `${weekdayCap} ${dayNum} ${monthCap}`,
    subLabel: '',
    fullAccessibleLabel: fullAccessible,
    isToday: false,
    isPast
  };
}

/**
 * Checks if a given date string is in the past compared to Europe/Rome today.
 */
export function isDatePast(dateStr: string): boolean {
  const todayStr = getRomeToday();
  return dateStr < todayStr;
}
