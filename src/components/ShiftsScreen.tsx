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
  Upload,
  Loader,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { DoctorShift, FamilyMember } from '../types';
import { SHIFT_META, SHIFT_TYPE_OPTIONS, WORK_SHIFT_TYPES } from '../data/shiftMeta';
import { longDateLabel, shortDateLabel, todayISO } from '../utils/date';
import { importShiftsPhoto, bulkCreateShifts, ShiftImportResult } from '../services/api';

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

  const [showImportModal, setShowImportModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [previewShifts, setPreviewShifts] = useState<Array<any>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

      {/* Import Photo Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl mx-4 sm:mx-0 sm:rounded-lg">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Step 1: Upload */}
              {currentStep === 1 && (
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">Importa foto turni</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Scatta o carica una foto del foglio dei turni del mese selezionato.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mese
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <option key={m} value={m}>
                            {new Date(0, m - 1).toLocaleString('it-IT', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Anno
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Foto
                      </label>
                      <div className="flex flex-col">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setSelectedFile(file);
                            if (file) {
                              // Validate file size (10 MB limit)
                              if (file.size > 10 * 1024 * 1024) {
                                setImportError('Il file è troppo grande (max 10 MB)');
                                setSelectedFile(null);
                              } else {
                                setImportError(null);
                              }
                            }
                          }}
                          className="mb-2 block w-full text-sm text-slate-500"
                        >
                          Scegli un file
                        </input>
                        {selectedFile && (
                          <p className="text-xs text-slate-500">
                            {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                          </p>
                        )}
                      </div>
                    </div>

                    {importError && (
                      <p className="text-xs text-red-600">{importError}</p>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedFile) {
                          setImportError('Seleziona una foto');
                          return;
                        }
                        setIsAnalyzing(true);
                        setImportError(null);
                        try {
                          const result = await importShiftsPhoto(selectedFile, selectedMonth, selectedYear);
                          setIsAnalyzing(false);
                          // Convert the result to our preview format
                          const shiftsWithIndex = result.shifts.map((shift, index) => ({
                            ...shift,
                            originalIndex: index,
                          }));
                          setPreviewShifts(shiftsWithIndex);
                          setCurrentStep(2);
                        } catch (err: any) {
                          setIsAnalyzing(false);
                          setImportError(
                            err?.response?.data?.detail ||
                              err?.message ||
                              'Errore durante l\'analisi della foto'
                          );
                        }
                      }}
                      disabled={isAnalyzing || !selectedFile}
                      className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {isAnalyzing ? 'Analisi in corso...' : 'Analizza foto'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Analyzing (spinner) */}
              {currentStep === 2 && (
                <div className="p-6 text-center">
                  <div className="mb-6">
                    <Loader className="h-8 w-8 text-sky-500 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-bold mb-4">Analisi del foglio...</h3>
                  <p className="text-sm text-slate-600">
                    Stiamo elaborando la foto con l\'intelligenza artificiale. Questo potrebbe richiedere qualche secondo.
                  </p>
                </div>
              )}

              {/* Step 3: Preview */}
              {currentStep === 3 && (
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">Anteprima turni estratti</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Controlla i turni estratti e correggi eventuali errori prima di salvare.
                  </p>

                  {importError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                      {importError}
                    </div>
                  )}

                  {importSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600">
                      {importSuccess}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr className="bg-slate-50">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Codice letto
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Tipo turno
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Confidenza
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Stato
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Modifica</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {previewShifts.length === 0 ? (
                          <tr>
                            <td colspan="6" className="px-6 py-4 text-center text-sm text-slate-500">
                              Nessun turno estratto dalla foto.
                            </td>
                          </tr>
                        ) : (
                          previewShifts.map((shift, index) => {
                            const isUnknown = shift.shift_type === 'sconosciuto';
                            const needsReview = shift.needs_review || isUnknown;
                            const confidencePercent = Math.round(shift.confidence);
                            const confidenceClass =
                              confidencePercent >= 80
                                ? 'text-green-600'
                                : confidencePercent >= 60
                                ? 'text-yellow-600'
                                : 'text-red-600';

                            return (
                              <tr key={index} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-900">
                                  {shift.day.toString().padStart(2, '0')}/{selectedMonth
                                    .toString()
                                    .padStart(2, '0')}/{selectedYear}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-900">
                                  {shift.raw_code ?? '(illegibile)'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-900">
                                  <select
                                    value={shift.shift_type}
                                    onChange={(e) => {
                                      const newShifts = [...previewShifts];
                                      newShifts[index] = {
                                        ...newShifts[index],
                                        shift_type: e.target.value,
                                        needs_review: false,
                                      };
                                      setPreviewShifts(newShifts);
                                    }}
                                    className="block w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                  >
                                    {[['mattina', 'Mattina'], ['pomeriggio', 'Pomeriggio'], ['giornata', 'Giornata'], ['notte', 'Notte'], ['psp', 'PSP'], ['gdg', 'GDG'], ['ferie', 'Ferie'], ['libero', 'Libero'], ['sconosciuto', 'Sconosciuto']].map(
                                      ([value, label]) => (
                                        <option key={value} value={value}>
                                          {label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`font-medium ${confidenceClass}`}>
                                    {confidencePercent}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm flex items-center">
                                  {needsReview ? (
                                    <>
                                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                                      <span className="text-yellow-600 font-medium">Da verificare</span>
                                    </>
                                  ) : (
                                    <span className="text-green-600 font-medium">OK</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                  <button
                                    onClick={() => {
                                      const newShifts = previewShifts.filter(
                                        (_, i) => i !== index
                                      );
                                      setPreviewShifts(newShifts);
                                    }}
                                    className="text-slate-500 hover:text-slate-600"
                                  >
                                    Eliminare
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                      Analizza di nuovo
                    </button>
                    <button
                      onClick={async () => {
                        // Check if there are any shifts that need review
                        const hasNeedsReview = previewShifts.some(
                          (s) => s.needs_review || s.shift_type === 'sconosciuto'
                        );
                        if (hasNeedsReview) {
                          setImportError(
                            'Non è possibile salvare finché ci sono turni da verificare.'
                          );
                          return;
                        }
                        setImportSuccess('Salvataggio turni...');
                        try {
                          // Prepare the payload for bulk creation
                          const shiftsPayload = previewShifts.map((shift) => ({
                            date: `${selectedYear}-${selectedMonth
                              .toString()
                              .padStart(2, '0')}-${shift.day
                              .toString()
                              .padStart(2, '0')}`,
                            shiftType: shift.shift_type,
                            // We don't have startTime and endTime from the photo, but we can get them from the shift type
                            // We'll leave them as null and let the backend apply defaults based on shift type.
                            startTime: null,
                            endTime: null,
                            notes: null,
                          }));
                          const result = await bulkCreateShifts({
                            memberId: 1, // Assuming the doctor is memberId 1
                            replaceDates: true,
                            shifts: shiftsPayload,
                          });
                          setImportSuccess(
                            `${result.created} turni importati correttamente`
                          );
                          // Close the modal after a short delay
                          setTimeout(() => {
                            setShowImportModal(false);
                          }, 1500);
                        } catch (err: any) {
                          setImportSuccess(null);
                          setImportError(
                            err?.response?.data?.detail ||
                              err?.message ||
                              'Errore durante il salvataggio dei turni'
                          );
                        }
                      }}
                      disabled={previewShifts.length === 0}
                      className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                    >
                      Conferma e salva
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
