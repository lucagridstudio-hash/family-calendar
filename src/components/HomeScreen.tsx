import React from 'react';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  MapPin,
  Stethoscope,
  ChevronRight,
  Sparkles,
  CalendarCheck2,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { CalendarEvent, DoctorShift, FamilyMember, ActiveTab } from '../types';
import { SHIFT_META, WORK_SHIFT_TYPES } from '../data/shiftMeta';
import { roleLabel } from '../data/uiMeta';
import {
  addDays,
  isoWeekNumber,
  longDateLabel,
  todayISO,
} from '../utils/date';

interface HomeScreenProps {
  members: FamilyMember[];
  todayShifts: DoctorShift[];
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  selectedMemberId: string | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onAskAI: (prompt: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  members,
  todayShifts,
  todayEvents,
  upcomingEvents,
  selectedMemberId,
  onNavigateTab,
  onAskAI,
}) => {
  const today = todayISO();

  const filteredTodayEvents = selectedMemberId
    ? todayEvents.filter((ev) => ev.memberId === selectedMemberId)
    : todayEvents;

  const conflicts = todayEvents.filter((ev) => ev.isConflict);

  const workingShifts = todayShifts.filter((s) => WORK_SHIFT_TYPES.includes(s.shiftType));
  const heroShift = workingShifts[0] ?? todayShifts[0];
  const heroPerson = members.find((m) => m.isDoctor) ?? members[0];

  const findMember = (id: string) => members.find((m) => m.id === id);

  // Upcoming days: group real events for the next 6 days
  const upcomingDays = Array.from({ length: 6 }, (_, i) => addDays(today, i + 1))
    .map((date) => ({
      date,
      events: upcomingEvents.filter((e) => e.date === date),
    }))
    .filter((day) => day.events.length > 0);

  return (
    <div className="space-y-4 pb-20 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Date & Quick Status Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs tracking-wider uppercase">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{longDateLabel(today)}</span>
          </div>

          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full">
            Settimana {isoWeekNumber(today)}
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
          Cosa dobbiamo fare oggi?
        </h2>

        <p className="text-xs text-slate-500 mt-0.5">
          {todayEvents.length} impegni in programma
          {todayShifts.length > 0 && <> • {todayShifts.length} turni</>}
          {conflicts.length > 0 && (
            <span className="text-amber-600 font-medium"> • {conflicts.length} attenzione</span>
          )}
        </p>
      </div>

      {/* 2. HERO CARD: Il turno di oggi */}
      <div
        id="hero-doctor-shift-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-900 via-sky-800 to-indigo-950 text-white p-4 shadow-md border border-sky-700/50"
      >
        <div className="absolute -right-4 -bottom-4 opacity-10 text-white pointer-events-none">
          <Stethoscope className="w-36 h-36" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/30 border border-sky-400/30 text-sky-200">
                <Stethoscope className="w-4 h-4" />
              </span>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">
                  Turno Ospedaliero
                </span>

                <div className="flex items-center gap-1.5 text-xs text-sky-100/90 font-medium">
                  <span>{heroPerson?.name ?? '—'}</span>
                  {heroPerson && <span>• {roleLabel(heroPerson.role)}</span>}
                </div>
              </div>
            </div>

            {heroShift ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-xs">
                <Clock className="w-3 h-3" />
                {SHIFT_META[heroShift.shiftType]?.label ?? heroShift.shiftType}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/90 text-emerald-950 shadow-xs">
                Nessun turno
              </span>
            )}
          </div>

          <div className="mt-3.5 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
            {heroShift ? (
              <>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      {heroShift.timeRange}
                    </div>

                    <div className="text-xs font-medium text-sky-200 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-sky-300" />
                      {heroShift.department}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase text-sky-200/80 font-bold block">
                      Reperibilità
                    </span>

                    <span className="text-xs font-semibold text-emerald-300">
                      {heroShift.isStandby ? 'ATTIVA 24H' : 'No'}
                    </span>
                  </div>
                </div>

                {heroShift.notes && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-start gap-1.5 text-xs text-sky-100/90">
                    <Info className="w-3.5 h-3.5 shrink-0 text-sky-300 mt-0.5" />
                    <span>{heroShift.notes}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm font-semibold text-sky-100">
                Nessun turno registrato per oggi 🎉
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-end">
            <button
              id="btn-view-all-shifts"
              onClick={() => onNavigateTab('shifts')}
              className="flex items-center gap-1 font-semibold text-sky-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg"
            >
              <span>Vedi tutti i turni</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. CONFLICT ALERT */}
      {conflicts.length > 0 && (
        <div
          id="conflict-alert-card"
          className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-950">
                  Sovrapposizioni di oggi
                </h3>

                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Da gestire
                </span>
              </div>

              <ul className="text-xs text-amber-900 mt-1.5 space-y-1">
                {conflicts.map((event) => {
                  const member = findMember(event.memberId);
                  return (
                    <li key={event.id} className="leading-relaxed">
                      <strong>{member?.name ?? 'Famiglia'}</strong> — {event.title} ({event.startTime})
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex justify-end">
                <button
                  id="btn-solve-conflict-ai"
                  onClick={() => onAskAI('Come possiamo organizzarci oggi? Ci sono sovrapposizioni?')}
                  className="flex items-center justify-center gap-1 text-xs font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                  <span>Chiedi consiglio all'AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PROGRAMMA DI OGGI */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />

            <h3 className="text-sm font-bold text-slate-900">
              Impegni di oggi ({filteredTodayEvents.length})
            </h3>
          </div>

          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-0.5"
          >
            <span>Apri calendario</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {filteredTodayEvents.map((event) => {
            const member = findMember(event.memberId);

            return (
              <div
                key={event.id}
                className={`relative rounded-xl p-3 border transition-all ${
                  event.isConflict
                    ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 shadow-xs"
                    style={{
                      backgroundColor: member ? `${member.color}15` : '#f1f5f9',
                    }}
                  >
                    {member?.avatar || '👤'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: member ? `${member.color}15` : '#e2e8f0',
                          color: member?.color || '#334155',
                        }}
                      >
                        {member?.name?.split(' ')[0] || 'Famiglia'}
                      </span>

                      {event.isRecurring && (
                        <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          Ricorrente
                        </span>
                      )}

                      {event.isConflict && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          Conflitto
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                      {event.title}
                    </h4>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {event.startTime} - {event.endTime}
                      </span>

                      {event.location && (
                        <span className="flex items-center gap-1 truncate text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>

                    {event.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        "{event.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTodayEvents.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-500">
              Nessun impegno in programma.
            </div>
          )}
        </div>
      </div>

      {/* 5. PANORAMICA PROSSIMI GIORNI */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-indigo-700" />

            <h3 className="text-sm font-bold text-slate-900">
              Nei prossimi giorni
            </h3>
          </div>
        </div>

        {upcomingDays.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            Nessun impegno nei prossimi giorni.
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingDays.slice(0, 4).map((day) => (
              <button
                key={day.date}
                onClick={() => onNavigateTab('calendar')}
                className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900">
                    {longDateLabel(day.date)}
                  </span>
                  <div className="text-[11px] text-slate-500 truncate">
                    {day.events
                      .slice(0, 3)
                      .map((e) => {
                        const member = findMember(e.memberId);
                        return `${e.startTime} ${e.title}${member ? ` (${member.name.split(' ')[0]})` : ''}`;
                      })
                      .join(' • ')}
                    {day.events.length > 3 && ` +${day.events.length - 3}`}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Quick Assistant recommendation banner */}
        <div className="mt-3 bg-gradient-to-r from-sky-50 to-indigo-50 border border-indigo-100 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />

            <span className="text-xs text-indigo-950 font-medium">
              "Quando siamo tutti liberi per una gita in famiglia?"
            </span>
          </div>

          <button
            onClick={() =>
              onAskAI('Quando siamo tutti liberi per una gita questa settimana?')
            }
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 shrink-0"
          >
            <span>Verifica</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
