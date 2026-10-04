import { italianDateKey, italianDateAfterDays } from '@/lib/crm/date';
import { Opportunity, CommercialTask, SalesRep, Brand } from '@/lib/crm/types';

export const INITIAL_BRANDS: Brand[] = [];

export const INITIAL_REPS: SalesRep[] = [];

export const INITIAL_SERVICES: Record<string, string[]> = {
  Default: ['Consulenza', 'Sviluppo Progetto', 'Servizio Premium', 'Abbonamento Mensile', 'Strategia di Vendita'],
};

// INITIAL DATA IS EMPTY (0 TRATTATIVE, 0€ PIPELINE, 0 TASK)
export const INITIAL_OPPORTUNITIES: Opportunity[] = [];
export const INITIAL_TASKS: CommercialTask[] = [];

// Optional Demo Data for testing if the user explicitly clicks "Carica Dati Demo"
const today = italianDateKey();
const yesterday = italianDateAfterDays(-1);
const tomorrow = italianDateAfterDays(1);

export const DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'CS-8429',
    name: 'Dott. Mario Rossi',
    company: 'TechSpa S.r.l.',
    brand: 'Divisione B2B',
    service: 'Gestione Lead Generation',
    leadSource: 'Webinar B2B',
    salesRep: 'Francesco V.',
    phone: '+39 02 8934521',
    whatsapp: '+393401234567',
    email: 'm.rossi@techspa.it',
    value: 18500,
    valueType: 'One Shot',
    entryDate: today,
    stage: 'Trattativa',
    notes: 'Azienda software B2B con 40 dipendenti. Molto interessati a scalare lead generation su Meta e LinkedIn.',
    dealHealthScore: 85,
    nextAction: {
      id: 'act-1',
      what: 'Richiamare dopo invio proposta tecnica per confermare budget trimestrale',
      who: 'Francesco V.',
      when: today,
      time: '14:30',
      type: 'chiamata',
      priority: 'Alta',
      completed: false,
    },
    history: [
      { id: 'h-1', date: '25/09', timestamp: '2026-09-25T10:00:00Z', title: 'Lead Inbound ricevuto da Form Webinar', type: 'task', author: 'System' },
      { id: 'h-2', date: '26/09', timestamp: '2026-09-26T15:30:00Z', title: 'Prima telefonata conoscitiva di qualifica', type: 'chiamata', author: 'Francesco V.' },
    ],
  },
  {
    id: 'DM-3011',
    name: 'Giulia Bianchi',
    company: 'Atelier Moda Milano S.p.A.',
    brand: 'Digital Services',
    service: 'Sviluppo E-Commerce',
    leadSource: 'Google Ads',
    salesRep: 'Marco T.',
    phone: '+39 02 7712390',
    whatsapp: '+393339876543',
    email: 'giulia.bianchi@ateliermoda.it',
    value: 34000,
    valueType: 'One Shot',
    entryDate: yesterday,
    stage: 'Chiusura',
    notes: 'Progetto migrazione da piattaforma precedente.',
    dealHealthScore: 92,
    nextAction: {
      id: 'act-2',
      what: 'Inviare contratto finale con clausola SLA e pianificare kick-off',
      who: 'Marco T.',
      when: today,
      time: '11:00',
      type: 'preventivo',
      priority: 'Alta',
      completed: false,
    },
    history: [
      { id: 'h-10', date: '20/09', timestamp: '2026-09-20T09:00:00Z', title: 'Lead ricevuto da Campagna Search', type: 'task', author: 'System' },
    ],
  },
  {
    id: 'PR-1092',
    name: 'Roberto Valente',
    company: 'Osteria Del Duca & Franchising',
    brand: 'Retail & Food',
    service: 'Consulenza Strategica & Margini',
    leadSource: 'Referral',
    salesRep: 'Elena B.',
    phone: '+39 051 445566',
    whatsapp: '+393481122334',
    email: 'r.valente@osteriadelduca.com',
    value: 4800,
    valueType: 'Mensile',
    entryDate: today,
    stage: 'Appuntamento',
    notes: 'Catena di locali tipici. Cercano ottimizzazione margini e food cost.',
    dealHealthScore: 78,
    nextAction: {
      id: 'act-3',
      what: 'Video call con responsabile per audit attuale',
      who: 'Elena B.',
      when: today,
      time: '16:00',
      type: 'appuntamento',
      priority: 'Media',
      completed: false,
    },
    history: [],
  },
];

export const DEMO_TASKS: CommercialTask[] = [
  {
    id: 'tsk-1',
    dealId: 'CS-8429',
    dealTitle: 'TechSpa S.r.l. - Dott. Mario Rossi',
    title: 'Richiamare Mario Rossi su preventivo B2B',
    client: 'Dott. Mario Rossi',
    brand: 'Divisione B2B',
    assignedTo: 'Francesco V.',
    type: 'chiamata',
    priority: 'Alta',
    date: today,
    time: '14:30',
    description: 'Verificare approvazione budget trimestrale €18.500',
    status: 'Da fare',
  },
  {
    id: 'tsk-2',
    dealId: 'DM-3011',
    dealTitle: 'Atelier Moda - Giulia Bianchi',
    title: 'Inviare contratto Digital Services con clausola SLA',
    client: 'Giulia Bianchi',
    brand: 'Digital Services',
    assignedTo: 'Marco T.',
    type: 'preventivo',
    priority: 'Alta',
    date: today,
    time: '11:00',
    description: 'Inviare PDF siglato per firma digitale DocuSign',
    status: 'Da fare',
  },
];
