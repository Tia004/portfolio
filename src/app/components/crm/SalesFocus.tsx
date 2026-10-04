'use client';
import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import type { CommercialTask, Opportunity } from '@/lib/crm/types';
import { italianDateKey } from '@/lib/crm/date';

type Queue = {
  id: string;
  label: string;
  description: string;
  icon: string;
  tasks?: CommercialTask[];
  deals?: Opportunity[];
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(date);
};

export const SalesFocus: React.FC = () => {
  const {
    tasks,
    opportunities,
    selectedBrand,
    selectedRep,
    setSelectedDeal,
    completeTask,
    triggerNextStepPrompt,
    setIsNewDealModalOpen,
  } = useCRM();

  const [active, setActive] = useState('overdue');
  const today = italianDateKey();
  const sevenDays = new Date(`${today}T12:00:00`);
  sevenDays.setDate(sevenDays.getDate() + 7);
  const horizon = `${sevenDays.getFullYear()}-${String(sevenDays.getMonth() + 1).padStart(2, '0')}-${String(sevenDays.getDate()).padStart(2, '0')}`;
  const fourteenDays = new Date(`${today}T12:00:00`);
  fourteenDays.setDate(fourteenDays.getDate() - 14);
  const staleSince = `${fourteenDays.getFullYear()}-${String(fourteenDays.getMonth() + 1).padStart(2, '0')}-${String(fourteenDays.getDate()).padStart(2, '0')}`;

  const visibleTasks = tasks.filter(
    (t) =>
      t.status !== 'Completata' &&
      (selectedBrand === 'all' || t.brand === selectedBrand) &&
      (selectedRep === 'all' || t.assignedTo === selectedRep)
  );

  const visibleDeals = opportunities.filter(
    (d) =>
      (selectedBrand === 'all' || d.brand === selectedBrand) &&
      (selectedRep === 'all' || d.salesRep === selectedRep)
  );

  const open = visibleDeals.filter((d) => !['Venduta', 'Persa', 'Stand-by'].includes(d.stage));

  const queues: Queue[] = [
    { id: 'overdue', label: 'In ritardo', description: 'Attività con scadenza passata', icon: 'priority_high', tasks: visibleTasks.filter((t) => t.date < today) },
    { id: 'today', label: 'Oggi', description: 'Attività previste per oggi', icon: 'today', tasks: visibleTasks.filter((t) => t.date === today) },
    { id: 'week', label: 'Prossimi 7 giorni', description: 'Pianifica la settimana', icon: 'date_range', tasks: visibleTasks.filter((t) => t.date > today && t.date <= horizon) },
    { id: 'missing', label: 'Senza prossimo passo', description: 'Trattative da pianificare', icon: 'add_task', deals: open.filter((d) => !d.nextAction?.what || d.nextAction.completed) },
    { id: 'actions', label: 'Follow-up scaduti', description: 'Prossimi passi oltre la data', icon: 'event_busy', deals: open.filter((d) => d.nextAction?.what && !d.nextAction.completed && d.nextAction.when < today) },
    {
      id: 'stale',
      label: 'Ferme da 14 giorni',
      description: 'Opportunità senza attività recenti',
      icon: 'history',
      deals: open.filter((d) => {
        const latest = d.history?.map((event) => event.timestamp?.slice(0, 10)).filter(Boolean).sort().at(-1);
        return (latest || d.entryDate) <= staleSince;
      }),
    },
    { id: 'high', label: 'Alto valore', description: 'Valore pari o superiore a € 20.000', icon: 'diamond', deals: open.filter((d) => d.value >= 20000).sort((a, b) => b.value - a.value) },
    { id: 'closing', label: 'Da chiudere', description: 'Trattative nella fase finale', icon: 'flag', deals: open.filter((d) => d.stage === 'Chiusura') },
    { id: 'wake', label: 'Da risvegliare', description: 'Stand-by scaduti o in scadenza', icon: 'alarm', deals: visibleDeals.filter((d) => d.stage === 'Stand-by' && !!d.standbyReactivationDate && d.standbyReactivationDate <= horizon) },
    { id: 'contacts', label: 'Contatti incompleti', description: 'Manca email o telefono', icon: 'contact_phone', deals: open.filter((d) => !d.email || !d.phone) },
  ];

  const selected = queues.find((q) => q.id === active) || queues[0];
  const count = (q: Queue) => (q.tasks?.length || 0) + (q.deals?.length || 0);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0b0c16]/85 backdrop-blur-2xl border border-white/[0.08] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              WORKSPACE / PRIORITÀ
            </span>
          </div>
          <h1 className="font-bold text-lg md:text-xl text-white tracking-tight mt-0.5">
            Focus Commerciale & Code di Lavoro
          </h1>
          <p className="text-xs text-neutral-400">
            Dieci viste pratiche e tempestive per decidere subito dove intervenire.
          </p>
        </div>

        <button
          onClick={() => setIsNewDealModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Nuova Opportunità</span>
        </button>
      </div>

      {/* Main Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Work Queues */}
        <nav
          className="lg:col-span-4 rounded-2xl bg-[#0b0c16]/85 backdrop-blur-2xl border border-white/[0.08] p-2 flex flex-col gap-1 shadow-sm"
          aria-label="Code di lavoro commerciali"
        >
          {queues.map((q) => {
            const isSelected = selected.id === q.id;
            const qCount = count(q);
            return (
              <button
                key={q.id}
                onClick={() => setActive(q.id)}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-violet-500/20 text-white border-violet-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                }`}
                aria-current={isSelected ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      isSelected ? 'text-violet-300' : 'text-neutral-400'
                    }`}
                  >
                    {q.icon}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <strong className="text-xs font-semibold text-white truncate leading-tight">
                      {q.label}
                    </strong>
                    <small className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {q.description}
                    </small>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums shrink-0 ${
                    isSelected
                      ? 'bg-violet-500/30 text-violet-200'
                      : qCount > 0
                      ? 'bg-white/[0.06] text-neutral-300'
                      : 'text-neutral-600'
                  }`}
                >
                  {qCount}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Column: Queue Details and Item List */}
        <section
          className="lg:col-span-8 rounded-2xl bg-[#0b0c16]/85 backdrop-blur-2xl border border-white/[0.08] overflow-hidden flex flex-col min-h-[460px] shadow-sm"
          aria-live="polite"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between gap-3 bg-white/[0.01]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block mb-0.5">
                CODA SELEZIONATA
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {selected.label}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">{selected.description}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-neutral-300 text-xs font-semibold tabular-nums">
              {count(selected)} elementi
            </span>
          </div>

          {/* Body */}
          {count(selected) === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-3 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">task_alt</span>
              </div>
              <strong className="text-sm font-bold text-white block">Qui è tutto in ordine</strong>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                Nessun elemento richiede attenzione immediata in questa vista.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05] overflow-y-auto max-h-[620px]">
              {selected.tasks?.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[17px]">event_note</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <strong className="text-xs font-bold text-white truncate">{task.title}</strong>
                      <span className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {task.client} · {task.brand} · {task.assignedTo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-neutral-400 tabular-nums hidden sm:block">
                      {formatDate(task.date)}
                      {task.time ? ` · ${task.time}` : ''}
                    </span>
                    <button
                      onClick={() =>
                        task.dealId && visibleDeals.find((d) => d.id === task.dealId)
                          ? setSelectedDeal(visibleDeals.find((d) => d.id === task.dealId)!)
                          : completeTask(task.id)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      {task.dealId ? 'Apri' : 'Completa'}
                    </button>
                  </div>
                </div>
              ))}

              {selected.deals?.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[17px]">work_outline</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <strong className="text-xs font-bold text-white truncate">{deal.company}</strong>
                      <span className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {deal.name} · {deal.brand} · {deal.stage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-violet-300 tabular-nums">
                      € {deal.value.toLocaleString('it-IT')}
                    </span>
                    <button
                      onClick={() =>
                        selected.id === 'missing'
                          ? triggerNextStepPrompt(deal)
                          : setSelectedDeal(deal)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      {selected.id === 'missing' ? 'Pianifica' : 'Apri'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
