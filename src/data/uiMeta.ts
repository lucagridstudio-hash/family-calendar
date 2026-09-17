// Static UI metadata only. All family/event/shift data comes from the backend API.
import type { FamilyRole } from '../types';

export const ROLE_LABELS: Record<FamilyRole, string> = {
  father: 'Papà',
  mother: 'Mamma',
  daughter: 'Figlia',
  son: 'Figlio',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as FamilyRole] ?? 'Famiglia';
}

export const SUGGESTED_QUESTIONS = [
  'Luciano lavora domani?',
  'Luciano è libero venerdì?',
  'Chi è disponibile domani?',
  'Quali sono i turni di questa settimana?',
  'Ci sono impegni sabato?',
];
