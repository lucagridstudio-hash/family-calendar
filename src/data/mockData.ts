import { FamilyMember, DoctorShift, CalendarEvent, ChatMessage } from '../types';

export const FAMILY_MEMBERS: FamilyMember[] = [  
];

export const DOCTOR_SHIFTS = [];

export const INITIAL_AI_MESSAGES = [
  {
    id: '1',
    sender: 'ai',
    text: 'Ciao! Sono il tuo assistente IA. Come posso aiutarti oggi con i turni o la gestione del calendario?',
    timestamp: 'Adesso'
  }
];

export const SUGGESTED_QUESTIONS = [
  "Quali sono i prossimi turni di lavoro?",
  "Mostrami i turni di notte di questo mese",
  "Quante ore di riposo ho la prossima settimana?"
];

export const MOCK_EVENTS = [];
export const MOCK_TASKS = [];
