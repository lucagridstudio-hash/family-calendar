import React, { useMemo, useState } from 'react';
import {
  Clock,
  MapPin,
  FileText,
  Repeat,
  CheckCircle,
  Zap,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { CalendarEvent, DoctorShift, EventCategory, FamilyMember } from '../types';
import { EVENT_CATEGORIES, CATEGORY_LABELS } from '../types';
import { SHIFT_META, WORK_SHIFT_TYPES } from '../data/shiftMeta';
import { roleLabel } from '../data/uiMeta';
import { addDays, longDateLabel, shortDateLabel, todayISO } from '../utils/date';

interface AddEventScreenProps {
  members: FamilyMember[];
  shifts: DoctorShift[];
  onAddEvent: (newEvent: Omit<CalendarEvent, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_CATEGORY: EventCategory = 'famiglia';

export const AddEventScreen: React.FC<AddEventScreenProps> = ({
  members,
  shifts,
  onAddEvent,
  onCancel,
}) => {
  const today = todayISO();
  const doctorMember = members.find((m) => m.isDoctor) ?? null;

  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? '');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [startTime, setStartTime] = useState<string>('17:30');
  const [endTime, setEndTime] = useState<string>('18:30');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [category, setCategory] = useState<EventCategory>(DEFAULT_CATEGORY);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recurrenceOptions = [
    { id: 'none', label: 'Nessuna ripetizione (singolo)' },
    { id: 'settimanale', label: 'Ogni settimana (stesso giorno)' },
    { id: 'bi-settimanale', label: 'Ogni 2 settimane' },
    { id: 'mensile', label: 'Ogni mese' },
  ];

  // Quick date presets built from the real current date
  const datePresets = [0, 1, 2, 3].map((offset) => ({
    label: offset === 0 ? `Oggi (${shortDateLabel(today)})` : shortDateLabel(addDays(today, offset)),
    val: addDays(today, offset),
  }));

  // REAL conflict check: is the doctor working (or busy) at this date/time?
  const relevantShift = useMemo(
    () => shifts.find((s) => s.date === date && WORK_SHIFT_TYPES.includes(s.shiftType)),
    [shifts, date],
  );

  const overlapsWithShift = useMemo(() => {
    if (!relevantShift) return false;
    const shiftStart = (relevantShift.timeRange.split(' - ')[0] ?? '').slice(0, 5);
    const shiftEnd = (relevantShift.timeRange.split(' - ')[1] ?? '').slice(0, 5);
    if (!shiftStart || !shiftEnd) return false;
    return startTime < shiftEnd && shiftStart < endTime;
  }, [relevantShift, startTime, endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMemberId || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onAddEvent({
        title: title.trim(),
        memberId: selectedMemberId,
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        category,
        isRecurring: recurrence !== 'none',
        recurrenceRule:
          recurrence !== 'none'
            ? recurrenceOptions.find((r) => r.id === recurrence)?.label
            : undefined,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        onCancel();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Nuovo Impegno Famigliare
            </h2>
            <p className="text-xs text-slate-500">
              Inserimento rapido e verifica automatica turni
            </p>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Zap className="w-3 h-3 text-emerald-600" />
            Veloce
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="bg-emerald-500 text-white rounded-2xl p-3.5 shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle className="w-5 h-5" />
            <span>Impegno salvato nel calendario!</span>
          </div>
        </div>
      )}

      {/* 2. Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {/* Campo 1: Persona */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Per chi è questo impegno? *
          </label>
          {members.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              Nessun membro disponibile. Controlla la connessione al server.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {members.map((member) => {
                const isSelected = selectedMemberId === member.id;
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'ring-2 ring-sky-500 bg-sky-50/50 border-sky-400 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{member.avatar}</span>
                    <div className="truncate">
                      <div className="text-xs truncate font-bold text-slate-900">
                        {member.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {roleLabel(member.role)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Campo 2: Titolo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Titolo dell'impegno *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es. Allenamento basket, Riunione a scuola, Visita dentistica..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          />
        </div>

        {/* Campo 3: Data */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            3. Data *
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {datePresets.map((preset) => (
              <button
                type="button"
                key={preset.val}
                onClick={() => setDate(preset.val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  date === preset.val
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">{longDateLabel(date)}</p>
        </div>

        {/* Campi 4 & 5: Orari */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ora di inizio *
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ora di fine *
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* REAL-TIME SHIFT CHECK (from real backend shifts) */}
        {relevantShift && (
          <div className={`rounded-xl p-3 flex items-start gap-2 text-xs border ${
            overlapsWithShift
              ? 'bg-amber-50 border-amber-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`p-1 rounded mt-0.5 ${overlapsWithShift ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-800">
                Turno di {doctorMember?.name ?? 'il medico'} in questa data:
              </span>{' '}
              <span className="font-semibold text-sky-800">
                {SHIFT_META[relevantShift.shiftType]?.label ?? relevantShift.title} ({relevantShift.timeRange})
              </span>
              {overlapsWithShift && (
                <p className="text-amber-700 mt-0.5 font-medium">
                  Attenzione: l'orario scelto si sovrappone al turno ospedaliero.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Campo 6: Categoria */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Categoria
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                  category === c
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Campo 7: Luogo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Luogo (opzionale)
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Es. Palasport, Casa dei nonni, Scuola..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Campo 8: Ripetizione */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Ripetizione
          </label>
          <div className="relative">
            <Repeat className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium appearance-none"
            >
              {recurrenceOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Campo 9: Note */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Note o promemoria
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Chi va a riprenderlo? Cosa portare?..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !selectedMemberId}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? 'Salvataggio…' : "Aggiungi all'agenda"}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
};
