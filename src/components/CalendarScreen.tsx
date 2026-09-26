import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Stethoscope,
  CalendarCheck,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type { CalendarEvent, DoctorShift, EventCategory, FamilyMember } from '../types';
import { EVENT_CATEGORIES, CATEGORY_LABELS } from '../types';
import { SHIFT_META } from '../data/shiftMeta';
import { todayISO, weekDaysFrom, weekLabel, addDays, shortDateLabel, addMonths, startOfWeek, startOfMonth } from '../utils/date';

interface CalendarScreenProps {
  events: CalendarEvent[];
  doctorShifts: DoctorShift[];
  members: FamilyMember[];
  onUpdateEvent: (id: string, changes: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

const Legend = () => (
  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
    {(['mattina', 'pomeriggio', 'notte', 'giornata', 'ferie', 'libero'] as const).map((type) => (
      <span key={type} className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${SHIFT_META[type].accent}`} /> {SHIFT_META[type].label}
      </span>
    ))}
  </div>
);

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  events,
  doctorShifts,
  members,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [anchorDate, setAnchorDate] = useState<string>(todayISO());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');

  const WeekView = () => {
    const weekDays = useMemo(() => weekDaysFrom(anchorDate), [anchorDate]);
    const filteredEvents = useMemo(
      () =>
        events.filter((ev) => {
          if (selectedMemberId && ev.memberId !== selectedMemberId) return false;
          if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
          return true;
        }),
      [events, selectedMemberId, categoryFilter],
    );
    const eventsForSelectedDate = filteredEvents.filter((ev) => ev.date === selectedDate);
    const shiftsForSelectedDate = doctorShifts.filter((s) => s.date === selectedDate);
    const activeShift = shiftsForSelectedDate[0];
    const findMember = (id: string) => members.find((m) => m.id === id);

    return (
      <>
        {/* 2. WEEK STRIP */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isSelected = selectedDate === day.date;
              const shift = doctorShifts.find((s) => s.date === day.date);
              const shiftMeta = shift ? SHIFT_META[shift.shiftType] : null;
              const dayEventsCount = filteredEvents.filter((e) => e.date === day.date).length;

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

                  {shiftMeta ? (
                    <span
                      className={`text-[9px] font-bold px-1 py-0.5 rounded border truncate max-w-full ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : shiftMeta.badge
                      }`}
                      title={`Turno: ${shiftMeta.label}`}
                    >
                      {shiftMeta.short}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent">-</span>
                  )}

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

          <Legend />
        </div>

        {/* 3. SELECTED DAY SHIFT BANNER */}
        {activeShift && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs shrink-0">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">
                  Turno ospedaliero in questa data
                </span>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>{activeShift.title}</span>
                  <span className="text-sky-700 font-semibold">• {activeShift.timeRange}</span>
                </div>
                <span className="text-[11px] text-slate-500">{activeShift.department}</span>
              </div>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${SHIFT_META[activeShift.shiftType]?.badge ?? ''}`}>
              {SHIFT_META[activeShift.shiftType]?.short}
            </span>
          </div>
        )}

        {/* 4. DAY DETAIL */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-sky-600" />
              <span>
                Impegni del giorno ({eventsForSelectedDate.length})
              </span>
            </h3>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {selectedDate === todayISO() ? `Oggi • ${shortDateLabel(selectedDate)}` : shortDateLabel(selectedDate)}
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
                const member = findMember(event.memberId);
                return (
                  <div
                    key={event.id}
                    className={`rounded-xl p-3 border transition-all ${
                      event.isConflict
                        ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-xl leading-none">{member?.avatar ?? '👤'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{
                                backgroundColor: member ? `${member.color}15` : '#e2e8f0',
                                color: member?.color || '#334155',
                              }}
                            >
                              {member?.name ?? 'Famiglia'}
                            </span>
                            {event.isRecurring && (
                              <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded flex items-center gap-1">
                                <RotateCcw className="w-2.5 h-2.5" />
                                {event.recurrenceRule || 'Ricorrente'}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              {CATEGORY_LABELS[event.category] ?? event.category}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {event.title}
                          </h4>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
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

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            setActionError(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                          title="Modifica impegno"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(event.id)}
                          disabled={deleting}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Elimina impegno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* EDIT MODAL */}
        {editingEvent && (
          <EditEventModal
            event={editingEvent}
            members={members}
            onClose={() => setEditingEvent(null)}
            onSave={async (changes) => {
              setActionError(null);
              try {
                await onUpdateEvent(editingEvent.id, changes);
                setEditingEvent(null);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : 'Errore salvataggio');
              }
            }}
            error={actionError}
          />
        )}
      </>
    );
  };

  const DayView = () => {
    return <div>DayView placeholder</div>;
  };

  const MonthView = () => {
    return <div>MonthView placeholder</div>;
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setActionError(null);
    try {
      await onDeleteEvent(id);
      setEditingEvent(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Errore eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Header & navigation */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Navigation buttons based on view */}
        {view === 'day' && (
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Giorno precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {view === 'week' && (
          <button
            onClick={() => {
              setAnchorDate(addDays(anchorDate, -7));
              setSelectedDate(addDays(selectedDate, -7));
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Settimana precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {view === 'month' && (
          <button
            onClick={() => {
              setAnchorDate(addMonths(anchorDate, -1));
              setSelectedDate(addMonths(selectedDate, -1));
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Mese precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              view === 'day'
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Giorno
          </button>
          <span className="text-slate-400">|</span>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              view === 'week'
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Settimana
          </button>
          <span className="text-slate-400">|</span>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              view === 'month'
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Mese
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Today button */}
        <button
          onClick={() => {
            setAnchorDate(todayISO());
            setSelectedDate(todayISO());
            if (view === 'week') {
              setAnchorDate(startOfWeek(todayISO()));
              setSelectedDate(todayISO());
            } else if (view === 'month') {
              setAnchorDate(startOfMonth(todayISO()));
              setSelectedDate(todayISO());
            }
          }}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          title="Oggi"
        >
          Oggi
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
          {members.map((member) => {
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

        {/* Category filter */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors border ${
              categoryFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tutte le categorie
          </button>
          {EVENT_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors border ${
                categoryFilter === category
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      {/* View Container */}
      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}

      {/* EDIT MODAL */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          members={members}
          onClose={() => setEditingEvent(null)}
          onSave={async (changes) => {
            setActionError(null);
            try {
              await onUpdateEvent(editingEvent.id, changes);
              setEditingEvent(null);
            } catch (error) {
              setActionError(error instanceof Error ? error.message : 'Errore salvataggio');
            }
          }}
          error={actionError}
        />
      )}
    </div>
  );
};

const EditEventModal: React.FC<{
  event: CalendarEvent;
  members: FamilyMember[];
  onClose: () => void;
  onSave: (changes: Partial<CalendarEvent>) => Promise<void>;
  error: string | null;
}> = ({ event, members, onClose, onSave, error }) => {
  const [title, setTitle] = useState(event.title);
  const [memberId, setMemberId] = useState(event.memberId);
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState(event.startTime);
  const [endTime, setEndTime] = useState(event.endTime);
  const [location, setLocation] = useState(event.location ?? '');
  const [notes, setNotes] = useState(event.notes ?? '');
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Modifica impegno</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Titolo</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Membro</label>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setMemberId(member.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    memberId === member.id
                      ? 'ring-2 ring-sky-500 bg-sky-50 border-sky-300 font-bold'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{member.avatar}</span>
                  <span>{member.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Inizio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fine</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Luogo</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Note</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              await onSave({ title, memberId, date, startTime, endTime, location: location || undefined, notes: notes || undefined, category });
              setSaving(false);
            }}
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
};
