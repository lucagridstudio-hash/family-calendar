import React, { useState } from 'react';
import {
  Camera,
  X,
  Upload,
  CheckCircle2,
  Sparkles,
  FileText,
  ScanLine,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';

interface ImportShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: () => void;
}

export const ImportShiftsModal: React.FC<ImportShiftsModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
}) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'preview'>('preview');

  if (!isOpen) return null;

  return (
    <div
      id="import-shifts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Importa Turni da Foto 📷
              </h3>
              <p className="text-[11px] text-sky-200">
                Scansione intelligente del foglio turni cartaceo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Design dimostrativo:</strong> questa schermata simula come papà potrà fotografare il foglio turni dell'ospedale affisso in bacheca per aggiornare tutta la famiglia in un secondo.
            </span>
          </div>

          {/* Camera Viewfinder Mockup */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-sky-400 bg-slate-900 p-4 text-white">
            {/* Corner guides */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br" />

            {/* Simulated paper document */}
            <div className="bg-slate-50 text-slate-900 rounded-xl p-3 text-[11px] font-mono shadow-md">
              <div className="border-b border-slate-300 pb-1.5 mb-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs uppercase block text-slate-800">
                    Ospedale Maggiore • Turni Settembre
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Reparto: DEA / Pronto Soccorso • Dott. Marco Rossi
                  </span>
                </div>
                <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded">
                  FOGLIO UFFICIALE
                </span>
              </div>

              {/* Table snippet */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between py-0.5 px-1 bg-sky-100/70 rounded text-sky-900 font-semibold">
                  <span>04/09 (Ven): POMERIGGIO [14-20:30]</span>
                  <span className="text-emerald-700 font-bold">✓ 99%</span>
                </div>
                <div className="flex justify-between py-0.5 px-1 bg-indigo-100/70 rounded text-indigo-950 font-semibold">
                  <span>05/09 (Sab): NOTTE DEA [20-08]</span>
                  <span className="text-emerald-700 font-bold">✓ 98%</span>
                </div>
                <div className="flex justify-between py-0.5 px-1 bg-slate-200/70 rounded text-slate-800">
                  <span>06/09 (Dom): SMONTO NOTTE + RIPOSO</span>
                  <span className="text-emerald-700 font-bold">✓ 100%</span>
                </div>
                <div className="flex justify-between py-0.5 px-1 bg-rose-100/70 rounded text-rose-900">
                  <span>07/09 (Lun): REPERIBILITÀ 24H</span>
                  <span className="text-emerald-700 font-bold">✓ 97%</span>
                </div>
              </div>
            </div>

            {/* Scanning radar indicator */}
            <div className="mt-3 flex items-center justify-between text-xs text-sky-200">
              <div className="flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-sky-400 animate-pulse" />
                <span className="font-medium">18 turni riconosciuti automaticamente</span>
              </div>
              <span className="font-bold text-emerald-400">Pronto</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onConfirmImport();
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Conferma e Salva nel Calendario Famiglia</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => alert('Nel prototipo finale si aprirà la fotocamera del dispositivo.')}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>Scatta nuova foto</span>
              </button>
              <button
                onClick={() => alert('Nel prototipo finale consentirà di selezionare una foto salvata in galleria.')}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Carica da galleria</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
