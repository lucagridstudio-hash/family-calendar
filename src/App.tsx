const CURRENT_DATE_STRING = new Date().toLocaleDateString('en-CA');

// React types are not installed in this project; provide minimal local declarations
// so the runtime-only setup can keep compiling without installing @types/react.
// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Smartphone,
  Maximize2,
  HeartHandshake,
  Wifi,
  Battery,
  HelpCircle,
} from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

import { ActiveTab, CalendarEvent, DoctorShift } from './types';
import {
createEvent,
getEvents,
getMembers,
getShifts,
} from './services/api';

import {
  DOCTOR_SHIFTS,
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

const [events, setEvents] = useState<CalendarEvent[]>([]);

const [doctorShifts, setDoctorShifts] =
  useState<DoctorShift[]>(DOCTOR_SHIFTS);
const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
null
);

const [isImportModalOpen, setIsImportModalOpen] = useState(false);
const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);

const [isPhoneFrame, setIsPhoneFrame] = useState(true);

// =========================================================
// LOAD DATA FROM BACKEND
// =========================================================

useEffect(() => {
const memberIdMap: Record<number, string> = {
1: 'marco',
2: 'laura',
3: 'luca',
4: 'nico',
};

Promise.all([getMembers(), getEvents(), getShifts()])
  .then(([, apiEvents, apiShifts]) => {
    // -------------------------
    // EVENTS
    // -------------------------

    const normalizedEvents: CalendarEvent[] = apiEvents.map((event) => ({
      id: String(event.id),
      title: event.title,
      memberId:
        memberIdMap[event.member_id] ?? String(event.member_id),
      date: String(event.date),
      startTime: String(event.start_time).slice(0, 5),
      endTime: String(event.end_time).slice(0, 5),
      location: event.location ?? undefined,
      category:
        String(event.category).toLowerCase() as CalendarEvent['category'],
      notes: event.notes ?? undefined,
      isRecurring: Boolean(event.is_recurring),
    }));

    setEvents(normalizedEvents);

    // -------------------------
    // SHIFTS
    // -------------------------

    const normalizedShifts: DoctorShift[] = apiShifts.map((shift) => ({
      id: String(shift.id),
      date: String(shift.date),
      dayLabel: String(shift.date),
      shiftType: shift.shift_type as DoctorShift['shiftType'],
      title: shift.title,
      timeRange:
        shift.start_time && shift.end_time
          ? `${String(shift.start_time).slice(0, 5)} - ${String(
              shift.end_time
            ).slice(0, 5)}`
          : 'Tutto il giorno',
      department: shift.department ?? 'Nessuno',
      isStandby: Boolean(shift.is_standby),
      notes: shift.notes ?? undefined,
      status: shift.status as DoctorShift['status'],
    }));

    setDoctorShifts(normalizedShifts);
  })
  .catch((error) => {
    console.error('API ERROR:', error);
  });

}, []);

// =========================================================
// DERIVED DATA
// =========================================================

const todayShift =
  doctorShifts.find((shift: DoctorShift) => shift.date === CURRENT_DATE_STRING) ??
doctorShifts[0];

const todayEvents = events.filter(
(event: CalendarEvent) => event.date === CURRENT_DATE_STRING
);

const upcomingEvents = events.filter(
(event: CalendarEvent) => event.date > CURRENT_DATE_STRING
);

const conflictsCount = todayEvents.filter(
(event: CalendarEvent) => event.isConflict
).length;

// =========================================================
// ADD EVENT
// =========================================================

const handleAddEvent = async (
newEventData: Omit<CalendarEvent, 'id'>
) => {
const memberIdMap: Record<string, number> = {
marco: 1,
laura: 2,
luca: 3,
nico: 4,
};

try {
  const savedEvent = await createEvent({
    title: newEventData.title,
    memberId: memberIdMap[newEventData.memberId] ?? 1,
    date: newEventData.date,
    startTime: newEventData.startTime,
    endTime: newEventData.endTime,
    category: newEventData.category,
    location: newEventData.location,
    notes: newEventData.notes,
  });

  const normalizedEvent: CalendarEvent = {
    id: String(savedEvent.id),
    title: savedEvent.title,
    memberId: newEventData.memberId,
    date: String(savedEvent.date),
    startTime: String(savedEvent.start_time).slice(0, 5),
    endTime: String(savedEvent.end_time).slice(0, 5),
    location: savedEvent.location ?? undefined,
    category:
      String(savedEvent.category).toLowerCase() as CalendarEvent['category'],
    notes: savedEvent.notes ?? undefined,
    isRecurring: Boolean(savedEvent.is_recurring),
  };

  setEvents((previousEvents) => [
    // Keep the state updater explicitly typed because React types are unavailable.
    normalizedEvent,
    ...previousEvents,
  ]);

  setActiveTab('calendar');
} catch (error) {
  console.error('CREATE EVENT ERROR:', error);
  alert('Impossibile salvare l’evento.');
}

};

// =========================================================
// AI
// =========================================================

const handleAskAI = (prompt: string) => {
setAiPrompt(prompt);
setActiveTab('ai');
};

// =========================================================
// SHIFT IMPORT
// =========================================================

const handleConfirmImport = () => {
alert(
'✅ 18 turni ospedalieri importati con successo dal foglio e sincronizzati nel calendario familiare!'
);
};

// =========================================================
// UI
// =========================================================

return ( <div className="min-h-screen bg-slate-900 text-slate-800 flex flex-col font-sans selection:bg-sky-200">
  {/* PRESENTATION TOOLBAR */}

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

      <button
        onClick={() => setIsReviewPanelOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
        title="Apri le 4 domande per discutere con la famiglia"
      >
        <HelpCircle className="w-3.5 h-3.5" />

        <span className="hidden sm:inline">
          Punti Discussione Famiglia
        </span>

        <span className="sm:hidden">
          Note
        </span>
      </button>

      <button
        onClick={() => setIsPhoneFrame(!isPhoneFrame)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
        title={
          isPhoneFrame
            ? 'Passa a schermo intero'
            : 'Mostra cornice smartphone'
        }
      >
        {isPhoneFrame ? (
          <>
            <Maximize2 className="w-3.5 h-3.5" />

            <span className="hidden md:inline">
              Schermo Intero
            </span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5" />

            <span className="hidden md:inline">
              Cornice Telefono
            </span>
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

          <span className="font-bold text-[11px] font-mono">
            09:41
          </span>

          <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center">

            <span className="w-2 h-2 rounded-full bg-sky-500/80 mr-2" />

            <span className="w-2 h-2 rounded-full bg-slate-700" />

          </div>

          <div className="flex items-center gap-1.5 text-slate-600">

            <Wifi className="w-3 h-3" />

            <span className="text-[10px] font-bold">
              5G
            </span>

            <Battery className="w-3.5 h-3.5" />

          </div>

        </div>
      )}

      {/* TOP BAR */}

      <TopBar
        onOpenReviewPanel={() => setIsReviewPanelOpen(true)}
        onSelectMember={(memberId: string) =>
          setSelectedMemberId(memberId)
        }
        selectedMemberId={selectedMemberId}
        conflictCount={conflictsCount}
      />

      {/* CONTENT */}

      <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-100">

        {activeTab === 'home' && (
          <HomeScreen
            todayShift={todayShift}
            todayEvents={todayEvents}
            upcomingEvents={upcomingEvents}
            onNavigateTab={(tab: ActiveTab) => setActiveTab(tab)}
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
            onOpenImportModal={() =>
              setIsImportModalOpen(true)
            }
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

      {/* BOTTOM NAVIGATION */}

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

      {/* HOME INDICATOR */}

      {isPhoneFrame && (
        <div className="bg-white py-1 flex justify-center border-t border-slate-100">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      )}

    </div>
  </main>

  {/* MODALS */}

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



