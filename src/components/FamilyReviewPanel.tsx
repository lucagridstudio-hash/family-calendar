import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  MessageSquare,
  Users,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';

interface FamilyReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FamilyReviewPanel: React.FC<FamilyReviewPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [q1Rating, setQ1Rating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const discussionPoints = [
    {
      num: '1',
      title: 'Il design è intuitivo?',
      desc: 'È chiaro a colpo d\'occhio cosa fare? Anche chi è meno abituato alle app (o i nonni) riesce a capire subito la schermata di oggi?',
      questionForDad: 'Per papà: riesci a verificare il tuo orario di lavoro in meno di 3 secondi appena apri l\'app?',
    },
    {
      num: '2',
      title: 'Quali informazioni devono essere più evidenti?',
      desc: 'I turni di papà spiccano abbastanza? I conflitti logistici (es. chi porta i bambini a basket) attirano la giusta attenzione senza spaventare?',
      questionForDad: 'Per mamma e papà: la distinzione tra Reperibilità h24 e Turno effettivo in reparto è chiara?',
    },
    {
      num: '3',
      title: 'Quali schermate sono realmente utili?',
      desc: 'Usate più la Home giornaliera o il Calendario settimanale? La funzione "Importa turni 📷" da foto ti farebbe risparmiare tempo?',
      questionForDad: 'Per tutta la famiglia: le domande veloci dell\'assistente AI (es. "Papà lavora sabato?") vi sono comode?',
    },
    {
      num: '4',
      title: 'Quali elementi devono essere modificati?',
      desc: 'Colori dei membri della famiglia, dimensioni del testo, campi nell\'inserimento eventi o dettagli dei reparti ospedalieri?',
      questionForDad: 'Mancano note come "cambio turno" o "macchina da condividere"?',
    },
  ];

  const handleCopyQuestions = () => {
    const text = discussionPoints
      .map((p) => `${p.num}. ${p.title}\n${p.desc}\n${p.questionForDad}\n`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="family-review-drawer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-indigo-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-800 text-indigo-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Guida Discussione Famiglia 📋
              </h3>
              <p className="text-[11px] text-indigo-200">
                Punti chiave per raccogliere feedback da mostrare insieme a casa
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-indigo-950">
            <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Mostra l'applicazione sullo schermo a papà, mamma e ai ragazzi. Lasciali navigare tra <strong>Home</strong>, <strong>Turni</strong> e <strong>Assistente AI</strong> e verificate insieme questi 4 punti:
            </span>
          </div>

          <div className="space-y-3">
            {discussionPoints.map((point) => (
              <div
                key={point.num}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {point.num}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {point.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                  {point.desc}
                </p>
                <div className="ml-8 mt-1.5 pt-1.5 border-t border-slate-200/80 text-[11px] font-medium text-sky-800 bg-sky-50/70 p-2 rounded-lg">
                  💡 {point.questionForDad}
                </div>
              </div>
            ))}
          </div>

          {/* Quick notes box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Appunti della discussione in famiglia:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Papà vorrebbe vedere il reparto ancora più grande; Mamma preferisce ricevere notifiche 2 ore prima del cambio turno..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyQuestions}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiato!' : 'Copia domande'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Torna al prototipo
          </button>
        </div>
      </div>
    </div>
  );
};
