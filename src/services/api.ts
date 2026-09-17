// API service: single source of truth for backend communication.
// Default: same-origin `/api` (the backend mounts the router under /api, and the
// Vite dev server proxies /api -> localhost:8000, so it also works through the
// external preview proxy). Override with VITE_API_URL if needed.

import type { CalendarEvent, DoctorShift, FamilyMember } from '../types';
import { markConflicts, normalizeEvent, normalizeMember, normalizeShift } from './normalize';

export const API_URL: string =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export const AI_CONFIGURED: boolean =
  String(import.meta.env?.VITE_AI_CONFIGURED ?? 'true').toLowerCase() !== 'false';

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError('Backend non raggiungibile: controlla che il server sia avviato.', 0);
  }
  if (!res.ok) {
    let detail = `Errore ${res.status}`;
    try {
      const body = await res.json();
      detail = typeof body?.detail === 'string' ? body.detail : detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export async function fetchCalendar(): Promise<{
  members: FamilyMember[];
  events: CalendarEvent[];
  shifts: DoctorShift[];
}> {
  const [members, events, shifts] = await Promise.all([
    request<unknown[]>('/members'),
    request<unknown[]>('/events'),
    request<unknown[]>('/shifts'),
  ]);
  return {
    members: (Array.isArray(members) ? members : []).map(normalizeMember),
    events: markConflicts((Array.isArray(events) ? events : []).map(normalizeEvent)),
    shifts: (Array.isArray(shifts) ? shifts : []).map(normalizeShift),
  };
}

export async function createEvent(payload: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const raw = await request<Record<string, unknown>>('/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeEvent(raw);
}

export async function updateEvent(id: string, payload: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const raw = await request<Record<string, unknown>>(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeEvent(raw);
}

export async function deleteEvent(id: string): Promise<void> {
  await request(`/events/${id}`, { method: 'DELETE' });
}

export async function createShift(payload: {
  memberId: number;
  date: string;
  shiftType: string;
  notes?: string;
}): Promise<DoctorShift> {
  const raw = await request<Record<string, unknown>>('/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeShift(raw);
}

export async function deleteShift(id: string): Promise<void> {
  await request(`/shifts/${id}`, { method: 'DELETE' });
}

export interface AiChatResult {
  reply: string;
  engine: 'gemini' | 'local';
  aiConfigured: boolean;
  warning?: string | null;
}

export async function askAI(message: string): Promise<AiChatResult> {
  return request<AiChatResult>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
