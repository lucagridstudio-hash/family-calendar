export type FamilyRole = 'father' | 'mother' | 'daughter' | 'son';

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
  roleLabel: string;
  avatar: string;
  color: string;
  isDoctor?: boolean;
}

/**
 * Shift types as stored in the backend (backend/app/shift_types.py).
 * Codes from the hospital sheet legend:
 *  MA = mattina • PO = pomeriggio • MA+PO = giornata • NO = notte
 *  PSP = sala operatoria • GDG = pronto soccorso • FF = ferie • $ = libero
 */
export type ShiftType =
  | 'mattina'
  | 'pomeriggio'
  | 'notte'
  | 'giornata'
  | 'ferie'
  | 'psp'
  | 'gdg'
  | 'smonto'
  | 'reperibilita'
  | 'libero';

export interface DoctorShift {
  id: string;
  date: string; // YYYY-MM-DD
  dayLabel: string;
  shiftType: ShiftType;
  title: string;
  timeRange: string;
  department: string;
  isStandby: boolean;
  notes?: string;
  status: 'confermato' | 'richiesta_cambio';
}

export type EventCategory = 'medico' | 'scuola' | 'sport' | 'lavoro' | 'famiglia' | 'visita' | 'amici';

export const EVENT_CATEGORIES: EventCategory[] = [
  'famiglia',
  'scuola',
  'sport',
  'medico',
  'visita',
  'lavoro',
  'amici',
];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  medico: 'Medico',
  scuola: 'Scuola',
  sport: 'Sport',
  lavoro: 'Lavoro',
  famiglia: 'Famiglia',
  visita: 'Visita',
  amici: 'Amici',
};

export interface CalendarEvent {
  id: string;
  title: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
  category: EventCategory;
  notes?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  isConflict?: boolean;
  conflictDescription?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export type ActiveTab = 'home' | 'calendar' | 'shifts' | 'add' | 'ai';
