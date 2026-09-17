import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Smartphone,
  Maximize2,
  HeartHandshake,
  Wifi,
  Battery,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

import type {
  ActiveTab,
  CalendarEvent,
  DoctorShift,
  FamilyMember,
} from './types';
import {
  createEvent,
  createShift,
  deleteEvent,
  deleteShift,
  fetchCalendar,
  updateEvent,
} from './services/api';
import { todayISO } from './utils/date';

import { TopBar } from './components/TopBar';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { ShiftsScreen } from './components/ShiftsScreen';
import { AddEventScreen } from './components/AddEventScreen';
import { AIAssistantScreen } from './components/AIAssistantScreen';
import { FamilyReviewPanel } from './components/FamilyReviewPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [shifts, setShifts] = useState<DoctorShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCalendar();
      setMembers(data.members);
      setEvents(data.events);
      setShifts(data.shifts);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayISO();

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------

  const todayShifts = useMemo(
    () => shifts.filter((shift) => shift.date === today),
    [shifts, today],
  );

  const todayEvents = useMemo(
    () => events.filter((event) => event.date === today),
    [events, today],
  );

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.date > today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [events, today],
  );

  const conflictsCount = useMemo(
    () => events.filter((event) => event.isConflict).length,
    [events],
  );

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  // ------------------------------------------------------------------
  // Events CRUD
  // ------------------------------------------------------------------

  const handleAddEvent = useCallback(async (newEvent: Omit<CalendarEvent, 'id'>) => {
    const saved = await createEvent(newEvent);
    setEvents((prev) => [...prev, saved]);
  }, []);

  const handleUpdateEvent = useCallback(async (id: string, changes: Partial<CalendarEvent>) => {
    const updated = await updateEvent(id, changes);
    setEvents((prev) => prev.map((event) => (event.id === id ? updated : event)));
  }, []);

  const handleDeleteEvent = useCallback(async (id: string) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  const handleAddShift = useCallback(async (payload: { date: string; shiftType: string; notes?: string }) => {
    const doctor = members.find((m) => m.isDoctor) ?? members[0];
    if (!doctor) throw new Error('Nessun membro disponibile per il turno');
    const numericId = Number(doctor.id);
    const saved = await createShift({ ...payload, memberId: Number.isNaN(numericId) ? 1 : numericId });
    setShifts((prev) =>
      [...prev.filter((s) => s.date !== saved.date || s.id === saved.id), saved].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
  }, [members]);

  const handleDeleteShift = useCallback(async (id: string) => {
    await deleteShift(id);
    setShifts((prev) => prev.filter((shift) => shift.id !== id));
  }, []);

  // ------------------------------------------------------------------
  // AI
  // ------------------------------------------------------------------

  const handleAskAI = useCallback((prompt: string) => {
    setAiPrompt(prompt);
    setActiveTab('ai');
  }, []);

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 flex flex-col font-sans selection:bg-sky-200">
      {/* PRESENTATION TOOLBAR */}
      <nav className="bg-slate-950/90 text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center text-white">
            <HeartHandshake className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight">
            Famiglia Insieme • Calendario Famigliare
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            title="Ricarica i dati dal server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Aggiorna</span>
          </button>

          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            title={isPhoneFrame ? 'Passa a schermo intero' : 'Mostra cornice smartphone'}
          >
            {isPhoneFrame ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Schermo Intero</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Cornice Telefono</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-4 md:p-6">
        <div
          className={`w-full bg-slate-100 flex flex-col overflow-hidden transition-all duration-300 relative ${
            isPhoneFrame
              ? 'max-w-[420px] h-[100dvh] sm:h-[860px] sm:rounded-[40px] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 sm:ring-1 sm:ring-slate-700'
              : 'max-w-3xl min-h-[100dvh] sm:rounded-2xl shadow-xl'
          }`}
        >
          {/* PHONE STATUS BAR */}
          {isPhoneFrame && (
            <div className="bg-white pt-2 px-6 pb-1 flex items-center justify-between text-slate-800 text-xs select-none border-b border-slate-100">
              <span className="font-bold text-[11px] font-mono">09:41</span>
              <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-sky-500/80 mr-2" />
                <span className="w-2 h-2 rounded-full bg-slate-700" />
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Wifi className="w-3 h-3" />
                <span className="text-[10px] font-bold">5G</span>
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Impossibile contattare il server</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{loadError}</p>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  Avvia il backend con: bun run backend
                </p>
              </div>
              <button
                onClick={() => void load()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Riprova
              </button>
            </div>
          ) : (
            <>
              <TopBar
                members={members}
                loading={loading}
                onSelectMember={setSelectedMemberId}
                selectedMemberId={selectedMemberId}
                conflictCount={conflictsCount}
                onOpenReviewPanel={() => setIsReviewPanelOpen(true)}
              />

              {/* CONTENT */}
              <div
                className={`flex-1 relative bg-slate-100 ${
                  activeTab === 'ai' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'
                }`}
              >
                {loading && members.length === 0 ? (
                  <div className="p-6 space-y-3 animate-pulse" data-testid="loading-skeleton">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
                        <div className="h-3 bg-slate-200 rounded w-1/3" />
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {activeTab === 'home' && (
                      <HomeScreen
                        members={members}
                        todayShifts={todayShifts}
                        todayEvents={todayEvents}
                        upcomingEvents={upcomingEvents}
                        selectedMemberId={selectedMemberId}
                        onNavigateTab={(tab: ActiveTab) => setActiveTab(tab)}
                        onAskAI={handleAskAI}
                      />
                    )}

                    {activeTab === 'calendar' && (
                      <CalendarScreen
                        events={events}
                        doctorShifts={shifts}
                        members={members}
                        onUpdateEvent={handleUpdateEvent}
                        onDeleteEvent={handleDeleteEvent}
                      />
                    )}

                    {activeTab === 'shifts' && (
                      <ShiftsScreen
                        shifts={shifts}
                        doctorMember={selectedMember ?? members.find((m) => m.isDoctor) ?? members[0] ?? null}
                        onAddShift={handleAddShift}
                        onDeleteShift={handleDeleteShift}
                      />
                    )}

                    {activeTab === 'add' && (
                      <AddEventScreen
                        members={members}
                        shifts={shifts}
                        onAddEvent={handleAddEvent}
                        onCancel={() => setActiveTab('home')}
                      />
                    )}

                    {activeTab === 'ai' && (
                      <AIAssistantScreen
                        initialPrompt={aiPrompt}
                        onNavigateTab={(tab) => setActiveTab(tab)}
                      />
                    )}
                  </>
                )}
              </div>

              <Navigation
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  if (tab !== 'ai') {
                    setAiPrompt(undefined);
                  }
                }}
                conflictCount={conflictsCount}
              />
            </>
          )}

          {/* HOME INDICATOR */}
          {isPhoneFrame && (
            <div className="bg-white py-1 flex justify-center border-t border-slate-100">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          )}
        </div>
      </main>

      <FamilyReviewPanel isOpen={isReviewPanelOpen} onClose={() => setIsReviewPanelOpen(false)} />
    </div>
  );
}
