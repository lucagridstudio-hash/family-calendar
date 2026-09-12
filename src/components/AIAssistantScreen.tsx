import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Heart,
  Stethoscope,
  Users
} from 'lucide-react';
import { ChatMessage } from '../types';
import { INITIAL_AI_MESSAGES, SUGGESTED_QUESTIONS } from '../data/mockData';

interface AIAssistantScreenProps {
  initialPrompt?: string;
  onNavigateTab: (tab: 'home' | 'calendar' | 'shifts' | 'add') => void;
}

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({
  initialPrompt,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_AI_MESSAGES);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle initial prompt if passed from another screen
  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const getSimulatedResponse = (query: string): { text: string; actionCard?: ChatMessage['actionCard'] } => {
    const q = query.toLowerCase();

    if (q.includes('papà oggi') || q.includes('che impegni ha papà')) {
      return {
        text: 'Oggi **Venerdì 4 Settembre**, papà Marco ha un **Turno Pomeridiano** al DEA Pronto Soccorso dalle **14:00 alle 20:30**.\n\nÈ a casa per pranzo con Sofia e Leo fino alle 13:30. Rientra a casa verso le 20:45 in tempo per la pizza in famiglia.',
        actionCard: {
          type: 'shift',
          title: 'Turno Pomeriggio Ospedale',
          details: '14:00 - 20:30 • DEA Pronto Soccorso (Ospedale Maggiore)',
          date: 'Oggi, 4 Settembre',
        },
      };
    }

    if (q.includes('domani mattina') || q.includes('lavora domani')) {
      return {
        text: 'No! Domani **Sabato 5 Settembre mattina papà è LIBERO** 🎉\n\nInfatti andrà a vedere la partita di basket di Leo alle ore 10:00 al palazzetto.\n\nAttenzione però: papà ha il **Turno di Notte** che inizia alle 20:00 e dura fino alle 08:00 di domenica mattina.',
        actionCard: {
          type: 'free_slot',
          title: 'Sabato Mattina Libero!',
          details: 'Partita Basket Leo ore 10:00 • Papà presente prima della notte (ore 20:00)',
          date: 'Sabato 5 Settembre',
        },
      };
    }

    if (q.includes('liberi') || q.includes('tutti liberi')) {
      return {
        text: 'Ho analizzato il calendario di tutti e i turni ospedalieri di papà:\n\n✨ **I migliori momenti in cui siete TUTTI liberi questa settimana:**\n1. **Mercoledì 9 Settembre:** Papà ha l\'intera giornata libera da turni, nessun impegno pomeridiano per Laura, ragazzi liberi dopo scuola dalle 16:30.\n2. **Domenica 6 Settembre pomeriggio (dalle 15:30):** Papà avrà recuperato la notte e potete fare una passeggiata o merenda insieme.',
        actionCard: {
          type: 'free_slot',
          title: 'Finestra Perfetta: Mercoledì 9 Settembre',
          details: 'Pomeriggio interamente libero per tutta la famiglia',
          date: 'Mercoledì 9 Settembre (Dalle 16:30)',
        },
      };
    }

    if (q.includes('cena sabato') || q.includes('sabato')) {
      return {
        text: '⚠️ **Per questo Sabato 5 Settembre, una cena tranquilla tutti insieme non è consigliata:**\nPapà Marco entra in turno di notte al Pronto Soccorso alle **20:00**, quindi uscirà di casa alle 19:15.\n\n💡 **Alternativa consigliata:**\nChe ne dite di anticipare la pizza insieme a **stasera (Venerdì)** dopo che papà torna alle 20:45, oppure fare un **pranzo speciale Sabato a mezzogiorno**?',
        actionCard: {
          type: 'conflict',
          title: 'Turno Notte Sabato alle 20:00',
          details: 'Consigliato pranzo sabato o cena stasera venerdì',
          date: 'Sabato 5 Settembre',
        },
      };
    }

    // Default intelligent family fallback
    return {
      text: `Ho controllato il calendario familiare per "${query}". Papà Marco è sempre allineato con i turni ospedalieri. Vuoi che crei un nuovo promemoria o che verifichi la disponibilità di Mamma, Sofia o Leo?`,
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const prompt = textToSend || inputValue;
    if (!prompt.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate smart calendar AI generation
    setTimeout(() => {
      const response = getSimulatedResponse(prompt);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        actionCard: response.actionCard,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-145px)] max-h-[800px] animate-in fade-in duration-200">
      {/* 1. Header with integrated badge */}
      <div className="bg-white px-4 py-3 border-b border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Assistente Famigliare AI
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[11px] text-slate-500">
              Connesso a turni di Marco, scuola, lavoro e sport
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('calendar')}
          className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 flex items-center gap-1"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendario</span>
        </button>
      </div>

      {/* 2. Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-br-xs shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Embedded action card if attached to response */}
                {msg.actionCard && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 bg-slate-50/90 rounded-xl p-2.5 text-xs text-slate-900 border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-slate-900">
                        {msg.actionCard.type === 'shift' && <Stethoscope className="w-3.5 h-3.5 text-sky-600" />}
                        {msg.actionCard.type === 'conflict' && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                        {msg.actionCard.type === 'free_slot' && <Heart className="w-3.5 h-3.5 text-rose-500" />}
                        {msg.actionCard.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">{msg.actionCard.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      {msg.actionCard.details}
                    </p>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 w-fit shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium">L'assistente consulta il calendario</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-sky-600 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Suggested Questions (MANDATORY REQUIREMENT) */}
      <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-200">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          <span>Domande frequenti (tocca per chiedere):</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 hover:border-sky-300 px-3 py-1.5 rounded-full shrink-0 transition-all shadow-2xs active:scale-95 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Chat input bar */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Chiedi qualcosa sui turni o gli impegni..."
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
            <button
              type="button"
              onClick={() => alert('Nel prototipo finale permetterà di dettare la domanda a voce con il microfono.')}
              className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="Dettatura vocale"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white shadow-xs transition-colors shrink-0"
            title="Invia"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
