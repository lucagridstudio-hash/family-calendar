import type { ShiftType } from '../types';

/** Visual metadata for each shift type (existing design direction preserved). */
export const SHIFT_META: Record<
  ShiftType,
  { label: string; short: string; badge: string; accent: string }
> = {
  mattina: {
    label: 'Mattina',
    short: 'M',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    accent: 'bg-amber-400',
  },
  pomeriggio: {
    label: 'Pomeriggio',
    short: 'P',
    badge: 'bg-sky-100 text-sky-900 border-sky-300',
    accent: 'bg-sky-400',
  },
  notte: {
    label: 'Notte',
    short: 'N',
    badge: 'bg-indigo-900 text-white border-indigo-700',
    accent: 'bg-indigo-900',
  },
  giornata: {
    label: 'MA+PO Giornata',
    short: 'G',
    badge: 'bg-orange-100 text-orange-900 border-orange-300',
    accent: 'bg-orange-400',
  },
  ferie: {
    label: 'Ferie (FF)',
    short: 'FF',
    badge: 'bg-teal-100 text-teal-900 border-teal-300',
    accent: 'bg-teal-400',
  },
  psp: {
    label: 'Sala Operatoria (PSP)',
    short: 'PSP',
    badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
    accent: 'bg-fuchsia-400',
  },
  gdg: {
    label: 'Pronto Soccorso (GDG)',
    short: 'GDG',
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    accent: 'bg-rose-400',
  },
  smonto: {
    label: 'Smonto Notte',
    short: 'SM',
    badge: 'bg-slate-200 text-slate-800 border-slate-300',
    accent: 'bg-slate-400',
  },
  reperibilita: {
    label: 'Reperibilità 24h',
    short: 'REP',
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    accent: 'bg-rose-500',
  },
  libero: {
    label: 'Libero',
    short: 'LIB',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accent: 'bg-emerald-400',
  },
};

export const SHIFT_TYPE_OPTIONS: ShiftType[] = [
  'mattina',
  'pomeriggio',
  'giornata',
  'notte',
  'psp',
  'gdg',
  'ferie',
  'libero',
  'smonto',
  'reperibilita',
];

export const WORK_SHIFT_TYPES: ShiftType[] = [
  'mattina',
  'pomeriggio',
  'giornata',
  'notte',
  'psp',
  'gdg',
  'reperibilita',
];
