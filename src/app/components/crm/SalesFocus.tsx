'use client';
import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import type { CommercialTask, Opportunity } from '@/lib/crm/types';
import { italianDateKey } from '@/lib/crm/date';

type Queue = { id: string; label: string; description: string; icon: string; tasks?: CommercialTask[]; deals?: Opportunity[] };
const formatDate = (value: string) => { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(date); };

export const SalesFocus: React.FC = () => {
  const { tasks, opportunities, selectedBrand, selectedRep, setSelectedDeal, completeTask, triggerNextStepPrompt, setIsNewDealModalOpen } = useCRM();
  const [active, setActive] = useState('overdue');
  const today = italianDateKey();
  const sevenDays = new Date(`${today}T12:00:00`); sevenDays.setDate(sevenDays.getDate() + 7);
  const horizon = `${sevenDays.getFullYear()}-${String(sevenDays.getMonth() + 1).padStart(2, '0')}-${String(sevenDays.getDate()).padStart(2, '0')}`;
  const fourteenDays = new Date(`${today}T12:00:00`); fourteenDays.setDate(fourteenDays.getDate() - 14);
  const staleSince = `${fourteenDays.getFullYear()}-${String(fourteenDays.getMonth() + 1).padStart(2, '0')}-${String(fourteenDays.getDate()).padStart(2, '0')}`;
  const visibleTasks = tasks.filter((t) => t.status !== 'Completata' && (selectedBrand === 'all' || t.brand === selectedBrand) && (selectedRep === 'all' || t.assignedTo === selectedRep));
  const visibleDeals = opportunities.filter((d) => (selectedBrand === 'all' || d.brand === selectedBrand) && (selectedRep === 'all' || d.salesRep === selectedRep));
  const open = visibleDeals.filter((d) => !['Venduta', 'Persa', 'Stand-by'].includes(d.stage));
  const queues: Queue[] = [
    { id: 'overdue', label: 'In ritardo', description: 'Attività con scadenza passata', icon: 'priority_high', tasks: visibleTasks.filter((t) => t.date < today) },
    { id: 'today', label: 'Oggi', description: 'Attività previste per oggi', icon: 'today', tasks: visibleTasks.filter((t) => t.date === today) },
    { id: 'week', label: 'Prossimi 7 giorni', description: 'Pianifica la settimana', icon: 'date_range', tasks: visibleTasks.filter((t) => t.date > today && t.date <= horizon) },
    { id: 'missing', label: 'Senza prossimo passo', description: 'Trattative da pianificare', icon: 'add_task', deals: open.filter((d) => !d.nextAction?.what || d.nextAction.completed) },
    { id: 'actions', label: 'Follow-up scaduti', description: 'Prossimi passi oltre la data', icon: 'event_busy', deals: open.filter((d) => d.nextAction?.what && !d.nextAction.completed && d.nextAction.when < today) },
    { id: 'stale', label: 'Ferme da 14 giorni', description: 'Opportunità senza attività recenti', icon: 'history', deals: open.filter((d) => {
      const latest = d.history?.map((event) => event.timestamp?.slice(0, 10)).filter(Boolean).sort().at(-1);
      return (latest || d.entryDate) <= staleSince;
    }) },
    { id: 'high', label: 'Alto valore', description: 'Valore pari o superiore a € 20.000', icon: 'diamond', deals: open.filter((d) => d.value >= 20000).sort((a,b) => b.value - a.value) },
    { id: 'closing', label: 'Da chiudere', description: 'Trattative nella fase finale', icon: 'flag', deals: open.filter((d) => d.stage === 'Chiusura') },
    { id: 'wake', label: 'Da risvegliare', description: 'Stand-by scaduti o in scadenza', icon: 'alarm', deals: visibleDeals.filter((d) => d.stage === 'Stand-by' && !!d.standbyReactivationDate && d.standbyReactivationDate <= horizon) },
    { id: 'contacts', label: 'Contatti incompleti', description: 'Manca email o telefono', icon: 'contact_phone', deals: open.filter((d) => !d.email || !d.phone) },
  ];
  const selected = queues.find((q) => q.id === active) || queues[0];
  const count = (q: Queue) => (q.tasks?.length || 0) + (q.deals?.length || 0);
  return <div className="focus-page">
    <div className="focus-heading"><div><span className="focus-eyebrow">WORKSPACE / PRIORITÀ</span><h1>Focus commerciale</h1><p>Dieci viste pratiche per decidere dove intervenire adesso.</p></div><button onClick={() => setIsNewDealModalOpen(true)}><span className="material-symbols-outlined">add</span> Nuova opportunità</button></div>
    <div className="focus-layout"><nav className="focus-queues" aria-label="Code di lavoro">{queues.map((q) => <button key={q.id} onClick={() => setActive(q.id)} className={`focus-queue ${selected.id === q.id ? 'active' : ''}`} aria-current={selected.id === q.id ? 'page' : undefined}><span className="material-symbols-outlined">{q.icon}</span><span className="focus-queue-copy"><strong>{q.label}</strong><small>{q.description}</small></span><em>{count(q)}</em></button>)}</nav>
    <section className="focus-results" aria-live="polite"><div className="focus-results-head"><div><span className="focus-eyebrow">CODA SELEZIONATA</span><h2>{selected.label}</h2><p>{selected.description}</p></div><span className="focus-total">{count(selected)} elementi</span></div>
      {count(selected) === 0 ? <div className="focus-empty"><span className="material-symbols-outlined">task_alt</span><strong>Qui è tutto in ordine</strong><p>Nessun elemento richiede attenzione in questa vista.</p></div> : <div className="focus-list">
        {selected.tasks?.map((task) => <div className="focus-row" key={task.id}><div className="focus-row-icon"><span className="material-symbols-outlined">event_note</span></div><div className="focus-row-main"><strong>{task.title}</strong><span>{task.client} · {task.brand} · {task.assignedTo}</span></div><time>{formatDate(task.date)}{task.time ? ` · ${task.time}` : ''}</time><button onClick={() => task.dealId && visibleDeals.find((d) => d.id === task.dealId) ? setSelectedDeal(visibleDeals.find((d) => d.id === task.dealId)!) : completeTask(task.id)}>{task.dealId ? 'Apri' : 'Completa'}</button></div>)}
        {selected.deals?.map((deal) => <div className="focus-row" key={deal.id}><div className="focus-row-icon"><span className="material-symbols-outlined">work_outline</span></div><div className="focus-row-main"><strong>{deal.company}</strong><span>{deal.name} · {deal.brand} · {deal.stage}</span></div><span className="focus-value">€ {deal.value.toLocaleString('it-IT')}</span><button onClick={() => selected.id === 'missing' ? triggerNextStepPrompt(deal) : setSelectedDeal(deal)}>{selected.id === 'missing' ? 'Pianifica' : 'Apri'}</button></div>)}
      </div>}</section></div>
  </div>;
};
