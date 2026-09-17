// Normalizers: backend (snake_case) -> frontend (camelCase) models.

import type { CalendarEvent, DoctorShift, EventCategory, FamilyMember, ShiftType } from '../types';

const VALID_CATEGORIES: EventCategory[] = [
  'medico', 'scuola', 'sport', 'lavoro', 'famiglia', 'visita', 'amici',
];

const VALID_SHIFT_TYPES: ShiftType[] = [
  'mattina', 'pomeriggio', 'notte', 'giornata', 'ferie', 'psp', 'gdg', 'smonto', 'reperibilita', 'libero',
];

export function hhmm(value: unknown): string {
  if (!value) return '';
  return String(value).slice(0, 5);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMember(raw: any): FamilyMember {
  return {
    id: String(raw.id),
    name: String(raw.name ?? 'Membro'),
    role: (raw.role ?? 'father') as FamilyMember['role'],
    roleLabel: String(raw.roleLabel ?? raw.role ?? ''),
    avatar: String(raw.avatar ?? '👤'),
    color: String(raw.color ?? '#0ea5e9'),
    isDoctor: Boolean(raw.is_doctor ?? raw.isDoctor),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeEvent(raw: any): CalendarEvent {
  const category = String(raw.category ?? 'famiglia').toLowerCase() as EventCategory;
  return {
    id: String(raw.id),
    title: String(raw.title ?? 'Impegno'),
    memberId: String(raw.member_id ?? raw.memberId ?? ''),
    date: String(raw.date ?? '').slice(0, 10),
    startTime: hhmm(raw.start_time ?? raw.startTime) || '00:00',
    endTime: hhmm(raw.end_time ?? raw.endTime) || '23:59',
    location: raw.location ?? undefined,
    category: VALID_CATEGORIES.includes(category) ? category : 'famiglia',
    notes: raw.notes ?? undefined,
    isRecurring: Boolean(raw.is_recurring ?? raw.isRecurring),
    recurrenceRule: raw.recurrence_rule ?? raw.recurrenceRule ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeShift(raw: any): DoctorShift {
  const shiftType = String(raw.shift_type ?? raw.shiftType ?? 'libero').toLowerCase() as ShiftType;
  const type = VALID_SHIFT_TYPES.includes(shiftType) ? shiftType : 'libero';
  const start = hhmm(raw.start_time ?? raw.startTime);
  const end = hhmm(raw.end_time ?? raw.endTime);
  const hasTimes = Boolean(start && end);
  return {
    id: String(raw.id),
    date: String(raw.date ?? '').slice(0, 10),
    dayLabel: String(raw.dayLabel ?? raw.date ?? ''),
    shiftType: type,
    title: String(raw.title ?? 'Turno'),
    timeRange: hasTimes ? `${start} - ${end}` : raw.timeRange || 'Tutto il giorno',
    department: String(raw.department ?? '—'),
    isStandby: Boolean(raw.is_standby ?? raw.isStandby),
    notes: raw.notes ?? undefined,
    status: (raw.status === 'richiesta_cambio' ? 'richiesta_cambio' : 'confermato'),
  };
}

/** Computes overlapping events for the same member (or whole-family conflicts). */
export function markConflicts(events: CalendarEvent[]): CalendarEvent[] {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  const conflicted = new Set<string>();
  for (const dayEvents of byDate.values()) {
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const a = dayEvents[i];
        const b = dayEvents[j];
        const overlaps = a.startTime < b.endTime && b.startTime < a.endTime;
        const sameMember = a.memberId === b.memberId;
        if (overlaps && sameMember) {
          conflicted.add(a.id);
          conflicted.add(b.id);
        }
      }
    }
  }

  return events.map((event) =>
    conflicted.has(event.id)
      ? { ...event, isConflict: true, conflictDescription: event.conflictDescription ?? 'Sovrapposizione di impegni.' }
      : event,
  );
}
