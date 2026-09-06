import React, { useState } from 'react';
import {
  Camera,
  Stethoscope,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Coffee,
  PhoneCall,
  Palmtree,
  Info
} from 'lucide-react';
import { DoctorShift } from '../types';
import { DOCTOR_SHIFTS } from '../data/mockData';

interface ShiftsScreenProps {
  shifts: DoctorShift[];
  onOpenImportModal: () => void;
}

export const ShiftsScreen: React.FC<ShiftsScreenProps> = ({
  shifts,
  onOpenImportModal,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'nights' | 'free'>('all');

  // Filter shifts
  const filteredShifts = shifts.filter((s) => {
    if (filterType === 'nights') return s.shiftType === 'notte' || s.isStandby;
    if (filterType === 'free') return s.shiftType === 'libero' || s.shiftType === 'smonto';
    return true;
  });

  // Calculate month metrics
  const nightCount = shifts.filter((s) => s.shiftType === 'notte').length;
  const standbyCount = shifts.filter((s) => s.isStandby).length;
  const freeDaysCount = shifts.filter((s) => s.shiftType === 'libero').length;
  const afternoonCount = shifts.filter((s) => s.shiftType === 'pomeriggio').length;
  const morningCount = shifts.filter((s) => s.shiftType === 'mattina').length;

  const getShiftVisual = (shift: DoctorShift) => {
    switch (shift.shiftType) {
      case 'mattina':
        return {
          icon: Sun,
          label: 'Turno Mattina',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          iconColor: 'text-amber-600',
          cardBorder: 'border-l-4 border-l-amber-400',
        };
      case 'pomeriggio':
        return {
          icon: Sunset,
          label: 'Turno Pomeriggio',
          badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
          iconColor: 'text-sky-600',
          cardBorder: 'border-l-4 border-l-sky-500',
        };
      case 'notte':
        return {
          icon: Moon,
          label: 'Turno Notte Ospedaliero',
          badgeClass: 'bg-indigo-900 text-white border-indigo-700',
          iconColor: 'text-indigo-400',
          cardBorder: 'border-l-4 border-l-indigo-900 bg-indigo-50/20',
        };
      case 'smonto':
        return {
          icon: Coffee,
          label: 'Smonto Notte (Recupero)',
          badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
          iconColor: 'text-slate-600',
          cardBorder: 'border-l-4 border-l-slate-400',
        };
      case 'reperibilita':
        return {
          icon: PhoneCall,
          label: 'Reperibilità 24h a Chiamata',
          badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
          iconColor: 'text-rose-600',
          cardBorder: 'border-l-4 border-l-rose-500 bg-rose-50/20',
        };
      case 'libero':
        return {
          icon: Palmtree,
          label: 'Giorno Libero (Famiglia)',
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          iconColor: 'text-emerald-600',
          cardBorder: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
        };
      default:
        return {
          icon: Clock,
          label: 'Altro',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          iconColor: 'text-slate-500',
          cardBorder: 'border-l-4 border-l-slate-300',
        };
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-1 px-4 animate-in fade-in duration-200">
      {/* 1. Profile & Month Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 text-white flex items-center justify-center text-xl shadow-xs">
              👨‍⚕️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-slate-900">
                  Turni Papà (Marco)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                  Medico DEA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ospedale Maggiore • Settembre 2026
              </p>
            </div>
          </div>
        </div>

        {/* 2. PROMINENT CALL TO ACTION: "Importa turni 📷" */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            id="btn-import-shifts-camera"
            onClick={onOpenImportModal}
            className="w-full relative overflow-hidden py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 hover:from-sky-700 hover:to-indigo-800 text-white shadow-md flex items-center justify-between group transition-all active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold flex items-center gap-1.5">
                  <span>Importa turni 📷</span>
                  <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md">
                    Foto OCR
                  </span>
                </div>
                <div className="text-[11px] text-sky-100 font-medium">
                  Fotografa il foglio cartaceo dell'ospedale per caricarlo
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center text-xs font-semibold bg-white/15 px-3 py-1.5 rounded-xl">
              <span>Scansiona</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Monthly Metrics Summary */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          Riepilogo Mese (Settembre)
        </h3>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
            <div className="flex items-center justify-center text-indigo-700 mb-1">
              <Moon className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-indigo-950">{nightCount}</div>
            <div className="text-[10px] font-semibold text-indigo-700">Notti DEA</div>
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
            <div className="text-[10px] font-semibold text-emerald-700">Giorni Liberi</div>
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

      {/* 4. Filter Buttons */}
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
          🌙 Notti & Reperibilità ({nightCount + standbyCount})
        </button>
        <button
          onClick={() => setFilterType('free')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
            filterType === 'free'
              ? 'bg-emerald-700 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          🌿 Giorni Liberi ({freeDaysCount})
        </button>
      </div>

      {/* 5. Shifts List */}
      <div className="space-y-3">
        {filteredShifts.map((shift) => {
          const visual = getShiftVisual(shift);
          const Icon = visual.icon;
          const isToday = shift.date === '2026-09-04';

          return (
            <div
              key={shift.id}
              className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs transition-all ${visual.cardBorder} ${
                isToday ? 'ring-2 ring-sky-500/80 bg-sky-50/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-slate-100 ${visual.iconColor} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {shift.dayLabel}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold bg-sky-600 text-white px-2 py-0.5 rounded-full">
                          OGGI
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${visual.badgeClass}`}>
                        {visual.label}
                      </span>
                    </div>

                    <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{shift.timeRange}</span>
                    </div>

                    <div className="text-xs text-slate-600 mt-0.5 font-medium">
                      Reparto: <span className="text-slate-800">{shift.department}</span>
                    </div>

                    {/* Reperibilità badge / indicator */}
                    {shift.isStandby && (
                      <div className="mt-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2 font-medium flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          <strong>Reperibilità Ospedaliera attiva:</strong> non allontanarsi oltre 25-30 minuti dall'ospedale.
                        </span>
                      </div>
                    )}

                    {shift.notes && (
                      <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        💬 "{shift.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
