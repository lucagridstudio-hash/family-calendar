import React, { useState } from 'react';
import {
  Smartphone,
  Maximize2,
  Minimize2,
  HeartHandshake,
  Stethoscope,
  Sparkles,
  Wifi,
  Battery,
  HelpCircle,
  Share2
} from 'lucide-react';
import { ActiveTab, CalendarEvent, DoctorShift } from './types';
import {
  CALENDAR_EVENTS,
  DOCTOR_SHIFTS,
  CURRENT_DATE_STRING,
  FAMILY_MEMBERS,
} from './data/mockData';
import { TopBar } from './components/TopBar';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { ShiftsScreen } from './components/ShiftsScreen';
import { AddEventScreen } from './components/AddEventScreen';
import { AIAssistantScreen } from './components/AIAssistantScreen';
import { ImportShiftsModal } from './components/ImportShiftsModal';
import { FamilyReviewPanel } from './components/FamilyReviewPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [events, setEvents] = useState<CalendarEvent[]>(CALENDAR_EVENTS);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>(DOCTOR_SHIFTS);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Modals & panels
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);

  // Layout mode: mobile smartphone frame mockup vs full-width
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  // Today's shift (2026-09-04)
  const todayShift =
    doctorShifts.find((s) => s.date === CURRENT_DATE_STRING) || doctorShifts[3];

  // Today's events
  const todayEvents = events.filter((e) => e.date === CURRENT_DATE_STRING);

  // Upcoming events
  const upcomingEvents = events.filter((e) => e.date > CURRENT_DATE_STRING);

  // Active conflicts
  const conflictsCount = todayEvents.filter((e) => e.isConflict).length;

  const handleAddEvent = (newEventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...newEventData,
      id: `ev-${Date.now()}`,
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleAskAI = (prompt: string) => {
    setAiPrompt(prompt);
    setActiveTab('ai');
  };

  const handleConfirmImport = () => {
    // Show quick feedback
    alert('✅ 18 turni ospedalieri importati con successo dal foglio e sincronizzati nel calendario famigliare!');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 flex flex-col font-sans selection:bg-sky-200">
      {/* Presentation Control Toolbar (For reviewing mockup with the family) */}
      <nav className="bg-slate-950/90 text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center text-white">
            <HeartHandshake className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight">
            Famiglia Insieme • Prototipo UI/UX Mobile
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Discussion guide button */}
          <button
            onClick={() => setIsReviewPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            title="Apri le 4 domande per discutere con la famiglia"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Punti Discussione Famiglia</span>
            <span className="sm:hidden">Note</span>
          </button>

          {/* Toggle frame mode */}
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

      {/* Main Container / Mobile Frame Wrapper */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-4 md:p-6">
        <div
          className={`w-full bg-slate-100 flex flex-col overflow-hidden transition-all duration-300 relative ${
            isPhoneFrame
              ? 'max-w-[420px] h-[100dvh] sm:h-[860px] sm:rounded-[40px] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 sm:ring-1 sm:ring-slate-700'
              : 'max-w-3xl min-h-[100dvh] sm:rounded-2xl shadow-xl'
          }`}
        >
          {/* Smartphone Top Notch / Island & Status Bar (in phone frame mode) */}
          {isPhoneFrame && (
            <div className="bg-white pt-2 px-6 pb-1 flex items-center justify-between text-slate-800 text-xs select-none border-b border-slate-100">
              <span className="font-bold text-[11px] font-mono">09:41</span>

              {/* Speaker pill / Dynamic island mockup */}
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

          {/* Top Bar Header */}
          <TopBar
            onOpenReviewPanel={() => setIsReviewPanelOpen(true)}
            onSelectMember={(memberId) => setSelectedMemberId(memberId)}
            selectedMemberId={selectedMemberId}
            conflictCount={conflictsCount}
          />

          {/* Screen Content Viewport */}
          <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-100">
            {activeTab === 'home' && (
              <HomeScreen
                todayShift={todayShift}
                todayEvents={todayEvents}
                upcomingEvents={upcomingEvents}
                onNavigateTab={(tab) => setActiveTab(tab)}
                selectedMemberId={selectedMemberId}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarScreen
                events={events}
                doctorShifts={doctorShifts}
              />
            )}

            {activeTab === 'shifts' && (
              <ShiftsScreen
                shifts={doctorShifts}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}

            {activeTab === 'add' && (
              <AddEventScreen
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
          </div>

          {/* Bottom Navigation */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab !== 'ai') setAiPrompt(undefined);
            }}
            conflictCount={conflictsCount}
          />

          {/* Smartphone bottom home gesture indicator */}
          {isPhoneFrame && (
            <div className="bg-white py-1 flex justify-center border-t border-slate-100">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ImportShiftsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmImport}
      />

      <FamilyReviewPanel
        isOpen={isReviewPanelOpen}
        onClose={() => setIsReviewPanelOpen(false)}
      />
    </div>
  );
}
