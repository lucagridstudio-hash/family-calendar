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
  Car,
} from 'lucide-react';
import { CalendarEvent, DoctorShift, ActiveTab } from '../types';
import { FAMILY_MEMBERS } from '../data/mockData';

interface HomeScreenProps {
  todayShift?: DoctorShift;
  todayEvents?: CalendarEvent[];
  upcomingEvents?: CalendarEvent[];
  onNavigateTab: (tab: ActiveTab) => void;
  selectedMemberId: string | null;
  onAskAI: (prompt: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  todayShift,
  todayEvents = [],
  upcomingEvents = [],
  onNavigateTab,
  selectedMemberId,
  onAskAI,
}) => {
  // Filter events if a specific member is selected
  const filteredTodayEvents = selectedMemberId
    ? todayEvents.filter((ev) => ev.memberId === selectedMemberId)
    : todayEvents;

  const conflicts = todayEvents.filter((ev) => ev.isConflict);

  // Find Marco safely. The previous code forced TypeScript to assume
  // that Marco always existed, which caused the runtime crash.
  const marco = FAMILY_MEMBERS.find((m) => m.id === 'marco');

  return (
    <div className="space-y-4 pb-20 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Date & Quick Status Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs tracking-wider uppercase">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Venerdì 4 Settembre 2026</span>
          </div>

          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full">
            Settimana 36
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
          Cosa dobbiamo fare oggi?
        </h2>

        <p className="text-xs text-slate-500 mt-0.5">
          {todayEvents.length} impegni in programma • 1 turno medico •{' '}
          <span className="text-amber-600 font-medium">
            1 attenzione logistica
          </span>
        </p>
      </div>

      {/* 2. HERO CARD: Il Turno di Papà Marco */}
      <div
        id="hero-doctor-shift-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-900 via-sky-800 to-indigo-950 text-white p-4 shadow-md border border-sky-700/50"
      >
        {/* Subtle background hospital motif */}
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
                  Turno Ospedaliero di Papà
                </span>

                <div className="flex items-center gap-1.5 text-xs text-sky-100/90 font-medium">
                  <span>{marco?.name ?? 'Papà Marco'}</span>
                  <span>•</span>
                  <span>Ospedale Maggiore</span>
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-xs">
              <Clock className="w-3 h-3" />
              Pomeriggio
            </span>
          </div>

          <div className="mt-3.5 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  {todayShift?.timeRange ?? 'Nessun turno'}
                </div>

                <div className="text-xs font-medium text-sky-200 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-300" />
                  {todayShift?.department ?? 'Reparto non specificato'}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-sky-200/80 font-bold block">
                  Reperibilità
                </span>

                <span className="text-xs font-semibold text-emerald-300">
                  {todayShift?.isStandby
                    ? 'ATTIVA 24H'
                    : 'Nessuna (Turno ordinario)'}
                </span>
              </div>
            </div>

            {todayShift?.notes && (
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-start gap-1.5 text-xs text-sky-100/90">
                <Info className="w-3.5 h-3.5 shrink-0 text-sky-300 mt-0.5" />
                <span>{todayShift.notes}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-sky-200/90 font-medium">
              A casa per pranzo • Rientro verso le 20:45
            </span>

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
                  ⚠️ Sovrapposizione Logistica alle 17:00
                </h3>

                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Da gestire
                </span>
              </div>

              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                <strong>Leo</strong> finisce Basket alle <strong>18:15</strong>{' '}
                al Palasport, ma <strong>Laura</strong> ha la riunione fino
                alle <strong>18:30</strong> e <strong>Papà</strong> è di turno
                in ospedale fino alle <strong>20:30</strong>.
              </p>

              <div className="mt-3 bg-white/80 rounded-xl p-2.5 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-950 font-medium">
                  <Car className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    Soluzione proposta: Chiedere a Nonna Rosa o carpooling con
                    mamma di Tommaso?
                  </span>
                </div>

                <button
                  id="btn-solve-conflict-ai"
                  onClick={() =>
                    onAskAI(
                      'Come possiamo risolvere il conflitto di oggi per il ritiro di Leo alle 18:15?'
                    )
                  }
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
            const member = FAMILY_MEMBERS.find(
              (m) => m.id === event.memberId
            );

            return (
              <div
                key={event.id}
                className={`relative rounded-xl p-3 border transition-all ${
                  event.isConflict
                    ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 shadow-xs"
                      style={{
                        backgroundColor: member
                          ? `${member.color}15`
                          : '#f1f5f9',
                      }}
                    >
                      {member?.avatar || '👤'}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: member
                              ? `${member.color}15`
                              : '#e2e8f0',
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

          <span className="text-xs text-slate-500">
            Sabato e Domenica
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Sabato */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Sabato 5 Settembre
              </span>

              <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                Papà: Turno Notte
              </span>
            </div>

            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong>10:00 - 11:45:</strong> Partita Leo Don Bosco{' '}
                  <span className="text-emerald-700 font-medium">
                    (Papà presente!)
                  </span>
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  <strong>15:00 - 17:30:</strong> Studio Sofia con amiche
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-sky-700 font-bold">•</span>
                <span>
                  <strong>20:00 - 08:00:</strong> Papà entra in turno notturno
                  DEA
                </span>
              </li>
            </ul>
          </div>

          {/* Domenica */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Domenica 6 Settembre
              </span>

              <span className="text-[10px] font-semibold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                Papà: Smonto Notte
              </span>
            </div>

            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="text-sky-600 font-bold">•</span>
                <span>
                  <strong>Mattina:</strong> Papà dorme per recuperare notte
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  <strong>13:00 - 16:00:</strong> Pranzo famiglia dai nonni
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-slate-500 font-bold">•</span>
                <span>
                  <strong>15:30:</strong> Papà si unisce per il caffè
                </span>
              </li>
            </ul>
          </div>
        </div>

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
              onAskAI(
                'Quando siamo tutti liberi per una gita questa settimana?'
              )
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
