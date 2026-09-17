import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  AlertCircle,
  Info,
  RotateCcw,
} from 'lucide-react';
import type { ChatMessage } from '../types';
import { askAI } from '../services/api';
import { SUGGESTED_QUESTIONS } from '../data/uiMeta';

interface AIAssistantScreenProps {
  initialPrompt?: string;
  onNavigateTab: (tab: 'home' | 'calendar' | 'shifts' | 'add') => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'assistant',
  text: 'Ciao! Sono l\'assistente del calendario di famiglia. Posso rispondere a domande sui turni di Luciano, gli impegni di tutti e la disponibilità della famiglia, usando i dati reali del calendario.',
  timestamp: '',
};

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({
  initialPrompt,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [engineInfo, setEngineInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledInitialPrompt = useRef<string | undefined>(undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = React.useCallback(async (textToSend: string) => {
    const prompt = textToSend.trim();
    if (!prompt || isTyping) return;

    const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setError(null);

    try {
      const result = await askAI(prompt);
      setEngineInfo(
        result.engine === 'gemini'
          ? 'Risposte generate con Gemini sui dati del calendario'
          : result.warning ?? 'Risposte generate dai dati reali del calendario (modalità locale)',
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          sender: 'assistant',
          text: result.reply,
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di comunicazione con il server');
    } finally {
      setIsTyping(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (initialPrompt && handledInitialPrompt.current !== initialPrompt) {
      handledInitialPrompt.current = initialPrompt;
      void sendMessage(initialPrompt);
    }
  }, [initialPrompt, sendMessage]);

  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Assistente Famigliare AI
              {!isTyping && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </h2>
            <p className="text-[11px] text-slate-500">
              Connesso ai turni e agli impegni reali della famiglia
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

      {/* 2. Engine info banner */}
      {engineInfo && (
        <div className="mx-4 mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-100/70 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <Info className="w-3 h-3 shrink-0" />
          <span className="truncate">{engineInfo}</span>
        </div>
      )}

      {/* 3. Messages */}
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
              </div>
              {msg.timestamp && (
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              )}
            </div>
          );
        })}

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-1 text-[11px] font-bold underline hover:no-underline"
              >
                Riprova
              </button>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 w-fit shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium">Consulto il calendario…</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-sky-600 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Suggested questions */}
      <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => void sendMessage(q)}
              disabled={isTyping}
              className="text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 hover:border-sky-300 px-3 py-1.5 rounded-full shrink-0 transition-all active:scale-95 text-left disabled:opacity-50"
            >
              {q}
            </button>
          ))}
          {messages.length > 1 && (
            <button
              onClick={() => {
                setMessages([INITIAL_MESSAGE]);
                setEngineInfo(null);
                setError(null);
              }}
              className="text-xs font-semibold bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-full shrink-0 flex items-center gap-1"
              title="Nuova conversazione"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Input */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = inputValue;
            setInputValue('');
            void sendMessage(text);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Es. Luciano lavora domani?"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
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
