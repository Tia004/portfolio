export type Brand = string;

export type ValueType = 'One Shot' | 'Mensile' | 'Annuale';

export type DealStage =
  | 'Nuovo lead'
  | 'Conoscenza'
  | 'Appuntamento'
  | 'Trattativa'
  | 'Chiusura'
  | 'Venduta'
  | 'Persa'
  | 'Stand-by';

export type ActivityType =
  | 'chiamata'
  | 'follow-up'
  | 'appuntamento'
  | 'preventivo'
  | 'whatsapp'
  | 'task'
  | 'standby-wake';

export type Priority = 'Alta' | 'Media' | 'Bassa';

export type TaskStatus = 'Da fare' | 'In corso' | 'Completata';

export interface NextAction {
  id?: string;
  what: string;
  who: string;
  when: string; // ISO date string YYYY-MM-DD
  time?: string; // HH:mm
  type: ActivityType;
  priority: Priority;
  completed?: boolean;
}

export interface ActivityHistoryItem {
  id: string;
  date: string; // e.g. "02/10" or ISO
  timestamp: string; // ISO
  title: string;
  description?: string;
  type: ActivityType;
  author: string;
}

export interface CommercialTask {
  id: string;
  dealId?: string;
  dealTitle?: string;
  title: string;
  client: string;
  brand: Brand;
  assignedTo: string;
  type: ActivityType;
  priority: Priority;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  meetingLink?: string;
  description?: string;
  status: TaskStatus;
}

export interface Opportunity {
  id: string;
  name: string; // Nome e cognome
  company: string; // Azienda
  brand: Brand;
  service: string; // Servizio interessato
  leadSource: string; // Webinar B2B, Google Ads, Meta Ads, Inbound, ecc.
  salesRep: string; // Responsabile commerciale
  phone: string;
  whatsapp: string;
  email: string;
  value: number; // Valore economico potenziale
  valueType: ValueType; // One Shot / Mensile / Annuale
  entryDate: string; // Data di ingresso (YYYY-MM-DD)
  stage: DealStage;
  notes: string;
  nextAction?: NextAction;
  history: ActivityHistoryItem[];
  // Stand-by fields:
  standbyReason?: string;
  standbyReactivationDate?: string; // YYYY-MM-DD
  // Win/Loss analysis:
  lossReason?: string;
  winDate?: string;
  // Computed or helper
  lastContactDate?: string;
  dealHealthScore?: number; // 0 - 100
}

export interface SalesRep {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  active: boolean;
}

export interface CommercialAlert {
  id: string;
  type: 'no-next-action' | 'expired-followup' | 'meeting-today' | 'stuck-deal' | 'standby-reactivate';
  title: string;
  description: string;
  dealId?: string;
  dealName?: string;
  severity: 'urgent' | 'warning' | 'info';
  date: string;
}

export interface KPISummary {
  soldTotal: number; // Venduto
  pipelineTotal: number; // Pipeline attiva
  openDealsCount: number; // Trattative aperte
  scheduledMeetingsCount: number; // Appuntamenti
  monthlyTarget: number;
  winRate: number;
}
