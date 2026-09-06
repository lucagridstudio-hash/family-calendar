export type FamilyRole = 'father' | 'mother' | 'daughter' | 'son';

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
  roleLabel: string;
  avatar: string;
  color: string;
  bgLight: string;
  borderLight: string;
  textColor: string;
  badgeBg: string;
  isDoctor?: boolean;
}

export type ShiftType = 'mattina' | 'pomeriggio' | 'notte' | 'smonto' | 'reperibilita' | 'libero';

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
  actionCard?: {
    type: 'shift' | 'free_slot' | 'conflict';
    title: string;
    details: string;
    date: string;
  };
}

export type ActiveTab = 'home' | 'calendar' | 'shifts' | 'add' | 'ai';
