import React, { useMemo, useState } from 'react';
import {
  Stethoscope,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  Sun,
  Sunset,
  Moon,
  Coffee,
  PhoneCall,
  Palmtree,
  CalendarDays,
  HeartPulse,
  Syringe,
} from 'lucide-react';
import type { DoctorShift, FamilyMember } from '../types';
import { SHIFT_META, SHIFT_TYPE_OPTIONS, WORK_SHIFT_TYPES } from '../data/shiftMeta';
import { longDateLabel, shortDateLabel, todayISO } from '../utils/date';

interface ShiftsScreenProps {
  shifts: DoctorShift[];
  doctorMember: FamilyMember | null;
  onAddShift: (payload: { date: string; shiftType: string; notes?: string }) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mattina: Sun,
  pomeriggio: Sunset,
  notte: Moon,
  giornata: Sun,
  ferie: Palmtree,
  psp: Syringe,
  gdg: HeartPulse,
  smonto: Coffee,
  reperibilita: PhoneCall,
  libero: Palmtree,
};

export const ShiftsScreen: React.FC<ShiftsScreenProps> = ({
  shifts,
  doctorMember,
  onAddShift,
  onDeleteShift,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'nights' | 'free'>('all');
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string>(todayISO());
  const [formType, setFormType] = useState<string>('mattina');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = todayISO();

  const filteredShifts = useMemo(
    () =>
      shifts
        .filter((s) => {
          if (filterType === 'nights') return s.shiftType === 'notte' || s.isStandby;
          if (filterType === 'free')
            return s.shiftType === 'libero' || s.shiftType === 'ferie' || s.shiftType === 'smonto';
          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [shifts, filterType],
  );

  const nightCount = shifts.filter((s) => s.shiftType === 'notte').length;
  const standbyCount = shifts.filter((s) => s.isStandby).length;
  const freeDaysCount = shifts.filter((s) => s.shiftType === 'libero' || s.shiftType === 'ferie').length;
  const afternoonCount = shifts.filter((s) => s.shiftType === 'pomeriggio').length;
  const morningCount = shifts.filter((s) => s.shiftType === 'mattina' || s.shiftType === 'giornata').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddShift({
        date: formDate,
        shiftType: formType,
        notes: formNotes.trim() || undefined,
      });
      setFormNotes('');
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Errore salvataggio turno');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteShift(id);
    } catch {
      /* errors surface via the API layer; list simply refreshes on next load */
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Profile & Month Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 text-white flex items-center justify-center text-xl shadow-xs">
            {doctorMember?.avatar ?? '👨‍⚕️'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900">
                Turni {doctorMember ? doctorMember.name : ''}
              </h2>
              {doctorMember?.isDoctor && (
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                  Medico
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {shifts.length} turni registrati
            </p>
          </div>
        </div>

        {/* Manual shift entry (OCR import removed by product decision) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            id="btn-add-shift"
            onClick={() => setShowForm((open) => !open)}
            className="w-full relative overflow-hidden py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white shadow-md flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold">Inserisci turno manualmente</div>
                <div className="text-[11px] text-sky-100 font-medium">
                  MA • PO • MA+PO • NO • PSP • GDG • FF • Libero
                </div>
              </div>
            </div>

            <ChevronDown
              className={`w-5 h-5 transition-transform ${showForm ? 'rotate-180' : ''}`}
            />
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              {formError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Tipo turno
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    {SHIFT_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {SHIFT_META[type].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Note (opzionale)
                </label>
                <input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Es. cambio turno con Dott. Rossi"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Salvataggio…' : 'Aggiungi turno'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 2. Metrics Summary */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          Riepilogo turni
        </h3>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
            <div className="flex items-center justify-center text-indigo-700 mb-1">
              <Moon className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-indigo-950">{nightCount}</div>
            <div className="text-[10px] font-semibold text-indigo-700">Notti</div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-center">
            <div className="flex items-center justify-center text-rose-700 mb-1">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-rose-950">{standbyCount}</div>
            <div className="text-[10px] font-semibold text-rose-700">Reperibilità</div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <div className="flex items-center justify-center text-emerald-700 mb-1">
              <Palmtree className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-emerald-950">{freeDaysCount}</div>
            <div className="text-[10px] font-semibold text-emerald-700">Liberi/Ferie</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-center">
            <div className="flex items-center justify-center text-sky-700 mb-1">
              <Sunset className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-sky-950">{afternoonCount}</div>
            <div className="text-[10px] font-semibold text-sky-700">Pomeriggi</div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <div className="flex items-center justify-center text-amber-700 mb-1">
              <Sun className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-amber-950">{morningCount}</div>
            <div className="text-[10px] font-semibold text-amber-700">Mattine</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Tutti i turni ({shifts.length})
        </button>
        <button
          onClick={() => setFilterType('nights')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
            filterType === 'nights'
              ? 'bg-indigo-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Notti & Reperibilità ({nightCount + standbyCount})
        </button>
        <button
          onClick={() => setFilterType('free')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
            filterType === 'free'
              ? 'bg-emerald-700 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Giorni Liberi ({freeDaysCount})
        </button>
      </div>

      {/* 4. Shifts List */}
      <div className="space-y-3">
        {filteredShifts.length === 0 && (
          <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 text-center">
            <CalendarDays className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              Nessun turno per questo filtro. Aggiungine uno manualmente.
            </p>
          </div>
        )}

        {filteredShifts.map((shift) => {
          const meta = SHIFT_META[shift.shiftType] ?? SHIFT_META.libero;
          const Icon = TYPE_ICONS[shift.shiftType] ?? Clock;
          const isWorking = WORK_SHIFT_TYPES.includes(shift.shiftType);
          const isToday = shift.date === today;

          return (
            <div
              key={shift.id}
              className={`relative bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs transition-all overflow-hidden ${
                isToday ? 'ring-2 ring-sky-500/80' : ''
              }`}
            >
              {/* Color accent strip for working shifts */}
              {isWorking && (
                <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${meta.accent}`} />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl bg-slate-100 text-slate-600 shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {shortDateLabel(shift.date)}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold bg-sky-600 text-white px-2 py-0.5 rounded-full">
                          OGGI
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {longDateLabel(shift.date)}
                    </div>

                    <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{shift.timeRange}</span>
                    </div>

                    <div className="text-xs text-slate-600 mt-0.5 font-medium">
                      Reparto: <span className="text-slate-800">{shift.department}</span>
                    </div>

                    {shift.isStandby && (
                      <div className="mt-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2 font-medium flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          <strong>Reperibilità attiva:</strong> non allontanarsi dall'ospedale.
                        </span>
                      </div>
                    )}

                    {shift.notes && (
                      <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{shift.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => void handleDelete(shift.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                  title="Elimina turno"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
