import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Repeat,
  User,
  CheckCircle,
  AlertTriangle,
  Zap,
  Tag,
  Check,
  ChevronDown
} from 'lucide-react';
import { CalendarEvent, FamilyMember, EventCategory, ActiveTab } from '../types';
import { FAMILY_MEMBERS, DOCTOR_SHIFTS } from '../data/mockData';

interface AddEventScreenProps {
  onAddEvent: (newEvent: Omit<CalendarEvent, 'id'>) => void;
  onCancel: () => void;
}

export const AddEventScreen: React.FC<AddEventScreenProps> = ({
  onAddEvent,
  onCancel,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('leo');
  const [title, setTitle] = useState<string>('Visita Pediatrica Controllo');
  const [date, setDate] = useState<string>('2026-09-04');
  const [startTime, setStartTime] = useState<string>('17:30');
  const [endTime, setEndTime] = useState<string>('18:30');
  const [location, setLocation] = useState<string>('Poliambulatorio San Carlo');
  const [notes, setNotes] = useState<string>('Portare libretto vaccinazioni');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [category, setCategory] = useState<EventCategory>('visita');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Quick date presets
  const datePresets = [
    { label: 'Oggi (Ven 4)', val: '2026-09-04' },
    { label: 'Domani (Sab 5)', val: '2026-09-05' },
    { label: 'Domenica 6', val: '2026-09-06' },
    { label: 'Lunedì 7', val: '2026-09-07' },
  ];

  // Quick repetition presets
  const recurrenceOptions = [
    { id: 'none', label: 'Nessuna ripetizione (singolo)' },
    { id: 'weekly', label: 'Ogni settimana (stesso giorno)' },
    { id: 'biweekly', label: 'Ogni 2 settimane' },
    { id: 'monthly', label: 'Ogni mese' },
  ];

  // Conflict detection preview
  const relevantShift = DOCTOR_SHIFTS.find((s) => s.date === date);
  const isFatherInShift = relevantShift && relevantShift.shiftType !== 'libero' && relevantShift.shiftType !== 'smonto';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddEvent({
      title,
      memberId: selectedMemberId,
      date,
      startTime,
      endTime,
      location,
      notes,
      category,
      isRecurring: recurrence !== 'none',
      recurrenceRule: recurrence !== 'none' ? recurrenceOptions.find(r => r.id === recurrence)?.label : undefined,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onCancel();
    }, 1200);
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
            <span>Impegno salvato nel calendario con successo!</span>
          </div>
        </div>
      )}

      {/* 2. Rapid Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        {/* Campo 1: Per chi è l'impegno? (Persona) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Per chi è questo impegno? *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FAMILY_MEMBERS.map((member) => {
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
                      {member.roleLabel.split('•')[0]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campo 2: Titolo Impegno */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Titolo dell'impegno *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es. Allenamento Basket, Riunione a scuola, Visita dentistica..."
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Campi 4 & 5: Ora Inizio e Ora Fine */}
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

        {/* REAL-TIME RADAR: Turno Papà Check */}
        {relevantShift && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-xs">
            <div className="p-1 rounded bg-sky-100 text-sky-700 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-800">
                Turno di Papà in questa data ({date}):
              </span>{' '}
              <span className="font-semibold text-sky-800">
                {relevantShift.title} ({relevantShift.timeRange})
              </span>
              {isFatherInShift && (
                <p className="text-amber-700 mt-0.5 font-medium">
                  💡 Papà sarà al lavoro in ospedale. Se serve accompagnare qualcuno in questo orario, assicurati che sia disponibile Mamma Laura.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Campo 6: Luogo */}
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

        {/* Campo 7: Ripetizione */}
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

        {/* Campo 8: Note aggiuntive */}
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
              placeholder="Es. Chi va a riprenderlo? Cosa portare? Documenti necessari..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Aggiungi all'agenda</span>
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
