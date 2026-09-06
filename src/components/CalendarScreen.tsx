import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Users,
  Stethoscope,
  Filter,
  CalendarCheck,
  Check
} from 'lucide-react';
import { CalendarEvent, DoctorShift, FamilyMember, EventCategory } from '../types';
import { FAMILY_MEMBERS, DOCTOR_SHIFTS } from '../data/mockData';

interface CalendarScreenProps {
  events: CalendarEvent[];
  doctorShifts: DoctorShift[];
  onSelectEvent?: (event: CalendarEvent) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  events,
  doctorShifts,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-04');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');

  // Days of the active week: Mon 31 Aug to Sun 6 Sep 2026
  const weekDays = [
    { date: '2026-08-31', dayNum: '31', dayName: 'Lun' },
    { date: '2026-09-01', dayNum: '1', dayName: 'Mar' },
    { date: '2026-09-02', dayNum: '2', dayName: 'Mer' },
    { date: '2026-09-03', dayNum: '3', dayName: 'Gio' },
    { date: '2026-09-04', dayNum: '4', dayName: 'Ven', isToday: true },
    { date: '2026-09-05', dayNum: '5', dayName: 'Sab' },
    { date: '2026-09-06', dayNum: '6', dayName: 'Dom' },
  ];

  // Filter events for selected date & filters
  const eventsForSelectedDate = events.filter((ev) => {
    if (ev.date !== selectedDate) return false;
    if (selectedMemberId && ev.memberId !== selectedMemberId) return false;
    if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
    return true;
  });

  const activeShift = doctorShifts.find((s) => s.date === selectedDate);

  // Helper for shift badge styles
  const getShiftBadge = (shiftType: string) => {
    switch (shiftType) {
      case 'mattina':
        return { label: 'Mattina', short: 'M', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'pomeriggio':
        return { label: 'Pomeriggio', short: 'P', bg: 'bg-sky-100 text-sky-900 border-sky-300' };
      case 'notte':
        return { label: 'Notte', short: 'N', bg: 'bg-indigo-900 text-white border-indigo-700' };
      case 'smonto':
        return { label: 'Smonto', short: 'SM', bg: 'bg-slate-200 text-slate-800 border-slate-300' };
      case 'reperibilita':
        return { label: 'Reperibile 24h', short: 'REP', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'libero':
        return { label: 'Libero', short: 'LIB', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      default:
        return { label: 'Riposo', short: '-', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Day time slots for Daily view
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00'
  ];

  return (
    <div className="space-y-4 pb-20 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Header & View Mode Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Calendario Famigliare
            </h2>
            <p className="text-xs text-slate-500">
              Settimana 36 • 31 Ago - 6 Set 2026
            </p>
          </div>

          {/* Toggle Daily / Weekly */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              id="view-toggle-weekly"
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settimana
            </button>
            <button
              id="view-toggle-daily"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giornaliera
            </button>
          </div>
        </div>

        {/* Family Member Filter Row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedMemberId(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
              selectedMemberId === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tutti i membri
          </button>
          {FAMILY_MEMBERS.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all border ${
                  isSelected
                    ? 'ring-2 ring-offset-1 ring-sky-500 bg-white font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                style={{
                  borderColor: isSelected ? member.color : undefined,
                  color: isSelected ? member.color : undefined,
                }}
              >
                <span>{member.avatar}</span>
                <span>{member.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. WEEK STRIP (Always visible for easy jumping) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = selectedDate === day.date;
            const shift = doctorShifts.find((s) => s.date === day.date);
            const shiftBadge = shift ? getShiftBadge(shift.shiftType) : null;
            const dayEventsCount = events.filter((e) => e.date === day.date).length;

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300'
                    : day.isToday
                    ? 'bg-sky-50 text-sky-900 border border-sky-200'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                  {day.dayName}
                </span>
                <span className={`text-sm font-extrabold my-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {day.dayNum}
                </span>

                {/* Father's shift pill below date */}
                {shiftBadge ? (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.2 rounded border truncate max-w-full ${
                      isSelected
                        ? 'bg-white/20 text-white border-white/30'
                        : shiftBadge.bg
                    }`}
                    title={`Papà: ${shiftBadge.label}`}
                  >
                    {shiftBadge.short}
                  </span>
                ) : (
                  <span className="text-[9px] text-transparent">-</span>
                )}

                {/* Event dots indicator */}
                {dayEventsCount > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-sky-600'}`} />
                    {dayEventsCount > 1 && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                    )}
                    {dayEventsCount > 2 && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend for quick understanding */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-1">
          <span className="font-semibold text-slate-700">Turni Papà:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Mattina (M)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Pomeriggio (P)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-900" /> Notte (N)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Libero (LIB)
          </span>
        </div>
      </div>

      {/* 3. ACTIVE DAY HIGHLIGHT: Selected Date Shift Status Banner */}
      {activeShift && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">
                Turno Ospedale Papà per questa data
              </span>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>{activeShift.title}</span>
                <span className="text-sky-700 font-semibold">• {activeShift.timeRange}</span>
              </div>
              <span className="text-[11px] text-slate-500">{activeShift.department}</span>
            </div>
          </div>

          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getShiftBadge(activeShift.shiftType).bg}`}>
            {getShiftBadge(activeShift.shiftType).label}
          </span>
        </div>
      )}

      {/* 4. MAIN CALENDAR CONTENT: Weekly or Daily View */}
      {viewMode === 'weekly' ? (
        /* WEEKLY DETAIL LIST FOR SELECTED DAY */
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-sky-600" />
              <span>
                Impegni del giorno ({eventsForSelectedDate.length})
              </span>
            </h3>
            <span className="text-xs text-slate-500">
              {selectedDate === '2026-09-04' ? 'Oggi (Venerdì 4)' : selectedDate}
            </span>
          </div>

          {eventsForSelectedDate.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-medium">
                Nessun impegno familiare registrato per questa data.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                La giornata è completamente libera!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {eventsForSelectedDate.map((event) => {
                const member = FAMILY_MEMBERS.find((m) => m.id === event.memberId);
                return (
                  <div
                    key={event.id}
                    className={`rounded-xl p-3 border transition-all ${
                      event.isConflict
                        ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl leading-none">{member?.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{
                                backgroundColor: member ? `${member.color}15` : '#e2e8f0',
                                color: member?.color || '#334155',
                              }}
                            >
                              {member?.name}
                            </span>
                            {event.isRecurring && (
                              <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded flex items-center gap-1">
                                <RotateCcw className="w-2.5 h-2.5" />
                                {event.recurrenceRule || 'Ricorrente'}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {event.title}
                          </h4>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {event.startTime} - {event.endTime}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{event.location}</span>
                              </span>
                            )}
                          </div>

                          {event.isConflict && (
                            <div className="mt-2 text-xs font-semibold text-amber-900 bg-amber-100/90 rounded-lg p-2 flex items-start gap-1.5 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                              <span>{event.conflictDescription}</span>
                            </div>
                          )}

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
            </div>
          )}
        </div>
      ) : (
        /* DAILY TIME-GRID VIEW */
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Griglia Oraria: {selectedDate}
            </h3>
            <span className="text-xs text-slate-500">Dalle 08:00 alle 22:00</span>
          </div>

          <div className="divide-y divide-slate-100">
            {timeSlots.map((slot) => {
              const hourNum = parseInt(slot.split(':')[0], 10);
              const eventsAtSlot = eventsForSelectedDate.filter((e) => {
                const startHour = parseInt(e.startTime.split(':')[0], 10);
                const endHour = parseInt(e.endTime.split(':')[0], 10);
                return hourNum >= startHour && hourNum < endHour;
              });

              return (
                <div key={slot} className="py-2 flex items-start gap-3 min-h-[48px]">
                  <span className="w-12 text-xs font-semibold text-slate-400 font-mono shrink-0 pt-0.5">
                    {slot}
                  </span>

                  <div className="flex-1 space-y-1">
                    {eventsAtSlot.length === 0 ? (
                      <div className="h-4 border-b border-dashed border-slate-100" />
                    ) : (
                      eventsAtSlot.map((ev) => {
                        const member = FAMILY_MEMBERS.find((m) => m.id === ev.memberId);
                        return (
                          <div
                            key={ev.id}
                            className={`rounded-lg p-2 text-xs border flex items-center justify-between ${
                              ev.isConflict
                                ? 'bg-amber-50 border-amber-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{member?.avatar}</span>
                              <span className="font-bold text-slate-900">{ev.title}</span>
                              <span className="text-slate-500 text-[11px]">
                                ({ev.startTime} - {ev.endTime})
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: member ? `${member.color}15` : '#e2e8f0',
                                color: member?.color || '#334155',
                              }}
                            >
                              {member?.name.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
