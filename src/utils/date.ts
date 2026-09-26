// Shared date helpers (no external date library needed).

const IT_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const IT_DAYS_LONG = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const IT_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** YYYY-MM-DD for a Date (local time, no timezone surprises). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse YYYY-MM-DD into a local Date. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(iso: string, months: number): string {
  const date = fromISODate(iso);
  date.setMonth(date.getMonth() + months);
  return toISODate(date);
}

export function startOfMonth(iso: string): string {
  const date = fromISODate(iso);
  date.setDate(1);
  return toISODate(date);
}

/** Monday of the week containing the given ISO date. */
export function startOfWeek(iso: string): string {
  const date = fromISODate(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(iso, diff);
}

export function weekDaysFrom(iso: string): { date: string; dayNum: string; dayName: string; isToday: boolean }[] {
  const monday = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, index) => {
    const dayIso = addDays(monday, index);
    const date = fromISODate(dayIso);
    return {
      date: dayIso,
      dayNum: String(date.getDate()),
      dayName: IT_DAYS_SHORT[date.getDay()],
      isToday: dayIso === todayISO(),
    };
  });
}

export function weekLabel(iso: string): string {
  const monday = fromISODate(startOfWeek(iso));
  const sunday = fromISODate(addDays(startOfWeek(iso), 6));
  const sameMonth = monday.getMonth() === sunday.getMonth();
  if (sameMonth) {
    return `${monday.getDate()} - ${sunday.getDate()} ${IT_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
  }
  return `${monday.getDate()} ${IT_MONTHS[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${IT_MONTHS[sunday.getMonth()].slice(0, 3)} ${sunday.getFullYear()}`;
}

/** "Venerdì 4 Settembre" style label. */
export function longDateLabel(iso: string): string {
  const date = fromISODate(iso);
  return `${IT_DAYS_LONG[date.getDay()]} ${date.getDate()} ${IT_MONTHS[date.getMonth()]}`;
}

/** "Ven 4" short label. */
export function shortDateLabel(iso: string): string {
  const date = fromISODate(iso);
  return `${IT_DAYS_SHORT[date.getDay()]} ${date.getDate()}`;
}

export function dayLabelWithYear(iso: string): string {
  const date = fromISODate(iso);
  return `${IT_DAYS_LONG[date.getDay()]} ${date.getDate()} ${IT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function isoWeekNumber(iso: string): number {
  const date = fromISODate(iso);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** HH:mm from "HH:MM(:SS)" backend values. */
export function hhmm(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).slice(0, 5);
}
