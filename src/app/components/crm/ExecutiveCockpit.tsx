'use client';

import { italianDateKey } from '@/lib/crm/date';

import React from 'react';
import { useCRM } from '@/lib/crm/store';
import { playAiBriefing, stopAllAudio, getSavedVoice } from '@/lib/crm/speechVoice';
import { CommercialTask, Opportunity } from '@/lib/crm/types';
import { getBrandBadge } from '@/lib/crm/brandBadges';

interface ExecutiveCockpitProps {
  onNavigateToTab: (tab: any) => void;
}

export const ExecutiveCockpit: React.FC<ExecutiveCockpitProps> = ({ onNavigateToTab }) => {
  const {
    kpis,
    tasks,
    opportunities,
    brands,
    addBrand,
    alerts,
    completeTask,
    setSelectedDeal,
    triggerNextStepPrompt,
    selectedBrand,
    selectedRep,
    syncStatus,
    setIsNewDealModalOpen,
  } = useCRM();

  const [briefingState, setBriefingState] = React.useState<'idle' | 'generating' | 'playing'>('idle');
  const [briefingText, setBriefingText] = React.useState<string | null>(null);
  const [activeVoice, setActiveVoice] = React.useState<string>('Aoede');

  React.useEffect(() => {
    setActiveVoice(getSavedVoice());
    return () => {
      stopAllAudio();
    };
  }, []);

  const handleStartBriefing = async () => {
    if (briefingState === 'playing') {
      stopAllAudio();
      setBriefingState('idle');
      return;
    }

    stopAllAudio();
    setBriefingState('generating');
    setBriefingText(null);
    const chosenVoice = getSavedVoice();
    setActiveVoice(chosenVoice);

    await playAiBriefing({
      voice: chosenVoice,
      crmContext: {
        pipelineTotal: kpis.pipelineTotal,
        openDealsCount: kpis.openDealsCount,
        todayTasksCount: todayTasks.length,
        brands: brands,
        urgentDeals: opportunities
          .filter((o) => o.stage !== 'Venduta' && o.stage !== 'Persa')
          .slice(0, 3)
          .map((o) => `${o.company} (€${o.value})`),
      },
      onGenerating: () => setBriefingState('generating'),
      onStart: () => setBriefingState('playing'),
      onText: (text) => setBriefingText(text),
      onEnd: () => setBriefingState('idle'),
      onError: (err) => {
        console.warn('Briefing error:', err);
        setBriefingState('idle');
      },
    });
  };

  const today = italianDateKey();

  // Activities for Today
  const todayTasks = tasks.filter(
    (t) =>
      t.date <= today &&
      t.status !== 'Completata' &&
      (selectedBrand === 'all' || t.brand.toLowerCase() === selectedBrand.toLowerCase()) &&
      (selectedRep === 'all' || t.assignedTo === selectedRep)
  );

  // Deals without next action that must be planned today
  const dealsWithoutAction = opportunities.filter(
    (d) =>
      d.stage !== 'Venduta' &&
      d.stage !== 'Persa' &&
      d.stage !== 'Stand-by' &&
      (!d.nextAction || !d.nextAction.what || d.nextAction.completed) &&
      (selectedBrand === 'all' || d.brand.toLowerCase() === selectedBrand.toLowerCase()) &&
      (selectedRep === 'all' || d.salesRep === selectedRep)
  );

  // Recent Won Sales
  const closedSales = opportunities
    .filter((d) => d.stage === 'Venduta')
    .slice(0, 4);
  const closedCount = opportunities.filter((d) => d.stage === 'Venduta' || d.stage === 'Persa').length;

  // Stand-by deals
  const standbyDeals = opportunities.filter(
    (d) =>
      d.stage === 'Stand-by' &&
      (selectedBrand === 'all' || d.brand.toLowerCase() === selectedBrand.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chiamata':
        return 'call';
      case 'follow-up':
        return 'history';
      case 'appuntamento':
        return 'video_call';
      case 'preventivo':
        return 'request_quote';
      case 'whatsapp':
        return 'chat';
      case 'standby-wake':
        return 'alarm_on';
      default:
        return 'task_alt';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full pb-16">
      {/* 1. Header Console Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
              VENDITE / PANORAMICA
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-on-surface tracking-tight mt-1">
            Il tuo spazio commerciale
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Le priorità di oggi, i risultati e le opportunità da seguire.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* AI Voice Briefing Direct Button */}
          {briefingState === 'idle' && (
            <button
              onClick={handleStartBriefing}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#121316] hover:bg-[#16171d] hover:border-white/20 text-white text-xs font-medium transition-all group shadow-sm cursor-pointer"
              title="Avvia la sintesi vocale del briefing commerciale di oggi"
            >
              <span className="material-symbols-outlined text-[17px] text-zinc-300 group-hover:scale-105 transition-transform">
                volume_up
              </span>
              <span>Briefing del Giorno</span>
            </button>
          )}

          {briefingState === 'generating' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/16 bg-white/[0.04] text-white text-xs font-medium animate-pulse">
              <span className="material-symbols-outlined text-[16px] text-zinc-300 animate-spin">progress_activity</span>
              <span>Generazione briefing AI…</span>
            </div>
          )}

          {briefingState === 'playing' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/20 bg-[#14151a] text-white text-xs font-medium">
                <div className="flex items-end gap-0.5 h-3.5 w-4 mr-0.5">
                  <span className="w-1 bg-zinc-200 rounded-full animate-wave-1 h-2" />
                  <span className="w-1 bg-zinc-200 rounded-full animate-wave-2 h-3.5" />
                  <span className="w-1 bg-zinc-200 rounded-full animate-wave-3 h-1.5" />
                  <span className="w-1 bg-zinc-200 rounded-full animate-wave-4 h-3" />
                </div>
                <span className="text-zinc-200 font-semibold">Briefing in riproduzione</span>
                <span className="text-[10px] text-zinc-400 tabular-nums">({activeVoice})</span>
              </div>
              <button
                onClick={() => {
                  stopAllAudio();
                  setBriefingState('idle');
                }}
                title="Interrompi riepilogo audio"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                <span>Interrompi</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs">
            <span className="material-symbols-outlined text-outline text-[16px]">sync</span>
            <span className="tabular-nums text-on-surface-variant">{syncStatus === 'saved' ? 'Dati salvati' : syncStatus === 'error' ? 'Salvataggio non riuscito' : 'Sincronizzazione…'}</span>
          </div>
          <button
            onClick={() => onNavigateToTab('kanban')}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">view_kanban</span>
            <span>Apri Kanban</span>
          </button>
        </div>
      </div>

      {/* AI Motivational Briefing Live Transcript Card */}
      {briefingText && briefingState !== 'idle' && (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#121316] p-4 text-xs shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-zinc-300 text-[18px]">format_quote</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Riepilogo Esecutivo & Motivazione Commerciale</span>
                  <span className="text-[10px] text-zinc-400 tabular-nums">· Voce AI {activeVoice}</span>
                </div>
                <p className="text-on-surface leading-relaxed text-[13px] italic font-medium">
                  &ldquo;{briefingText}&rdquo;
                </p>
              </div>
            </div>
            <button
              onClick={() => setBriefingText(null)}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-md cursor-pointer"
              title="Nascondi trascrizione"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Venduto */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Venduto
              </span>
              <div className="font-headline font-bold text-2xl md:text-3xl text-on-surface tracking-tight mt-1">
                € {kpis.soldTotal.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              {closedSales.length} trattative concluse
            </span>
            <span className="text-on-surface-variant tabular-nums">{closedSales.length} chiusure</span>
          </div>
        </div>

        {/* KPI 2: Pipeline Attiva */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Valore Pipeline Attiva
              </span>
              <div className="font-headline font-bold text-2xl md:text-3xl text-on-surface tracking-tight mt-1">
                € {kpis.pipelineTotal.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">account_tree</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Trattative in corso</span>
            <span className="font-semibold text-primary">{closedCount ? `${kpis.winRate}% tasso di chiusura` : 'Nessuna chiusura'}</span>
          </div>
        </div>

        {/* KPI 3: Trattative Aperte */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Trattative Aperte
              </span>
              <div className="font-headline font-bold text-2xl md:text-3xl text-on-surface tracking-tight mt-1">
                {kpis.openDealsCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">work_history</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">In lavorazione</span>
            <button
              onClick={() => onNavigateToTab('opportunities')}
              className="text-primary hover:underline font-semibold"
            >
              Vedi tutte →
            </button>
          </div>
        </div>

        {/* KPI 4: Appuntamenti */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Appuntamenti Programmati
              </span>
              <div className="font-headline font-bold text-2xl md:text-3xl text-on-surface tracking-tight mt-1">
                {kpis.scheduledMeetingsCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Meeting & Call</span>
            <button
              onClick={() => onNavigateToTab('calendar')}
              className="text-primary hover:underline font-semibold"
            >
              Apri calendario →
            </button>
          </div>
        </div>
      </div>

      {/* 4. SECTION: Da fare oggi (CRITICAL SECTION) */}
      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">today</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline font-bold text-xl text-on-surface tracking-tight">
                  Da fare oggi
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-bold text-xs">
                  {todayTasks.length + dealsWithoutAction.length} Attività
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Attività in scadenza e arretrate, ordinate per priorità.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('calendar')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Vista Completa Calendario</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Warning if there are deals without a next step */}
        {dealsWithoutAction.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-rose-500 text-[24px]">error</span>
              <div>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Regola Fondamentale Violata: {dealsWithoutAction.length} trattative aperte senza prossimo step!
                </span>
                <p className="text-[11px] text-on-surface-variant">
                  Nessuna trattativa può rimanere orfana di un&apos;azione commerciale. Pianifica subito cosa fare.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dealsWithoutAction.slice(0, 2).map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => triggerNextStepPrompt(deal)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">add_task</span>
                  <span>Imposta per {deal.company}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List of today's tasks */}
        {opportunities.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/50 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container text-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
            </div>
            <div>
              <span className="text-sm font-bold text-on-surface block">
                Benvenuto nel tuo Hub Commerciale!
              </span>
              <p className="text-xs text-on-surface-variant max-w-sm mt-0.5">
                {brands.length === 0
                  ? 'Il tuo workspace è pronto. Aggiungi il tuo primo brand aziendale per iniziare.'
                  : 'La dashboard è attiva con tutti i contatori a zero. Inizia inserendo la prima opportunità.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              {brands.length === 0 && (
                <button
                  onClick={() => {
                    const name = window.prompt('Inserisci il nome del brand che gestisci:');
                    if (name && name.trim()) addBrand(name.trim());
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-bold text-xs uppercase tracking-wider border border-outline-variant hover:border-primary flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add_business</span>
                  <span>Aggiungi Brand</span>
                </button>
              )}
              <button
                onClick={() => setIsNewDealModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-90 flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Inserisci Prima Opportunità</span>
              </button>
            </div>
          </div>
        ) : todayTasks.length === 0 && dealsWithoutAction.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant/50 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-[36px]">task_alt</span>
            <span className="text-sm font-bold text-on-surface">
              Ottimo lavoro! Tutte le attività commerciali di oggi sono state completate.
            </span>
            <p className="text-xs text-on-surface-variant">
              La pipeline è aggiornata. Puoi generare nuovi lead o verificare i follow-up di domani.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col justify-between gap-3 hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">
                        {getTypeIcon(task.type)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBrandBadge(task.brand)}`}>
                          {task.brand}
                        </span>
                        <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                          {task.client}
                        </span>
                        {task.time && (
                          <span className="text-[11px] tabular-nums text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                            {task.time}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-on-surface mt-1">
                        {task.title}
                      </span>
                      {task.description && (
                        <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0 ${
                      task.priority === 'Alta'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {task.assignedTo}
                  </span>

                  <div className="flex items-center gap-2">
                    {task.meetingLink && (
                      <a
                        href={task.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-[11px] transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">videocam</span>
                        <span>Meet</span>
                      </a>
                    )}
                    <button
                      onClick={() => completeTask(task.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                      title="Completa e pianifica prossimo step"
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      <span>Fatto</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Alerts & Commercial Anomalies + Stand-by Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Alerts */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[22px]">notifications_active</span>
              <h3 className="font-headline font-bold text-lg text-on-surface">
                Avvisi da seguire
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface tabular-nums font-bold text-xs">
              {alerts.length} Totali
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                Nessun avviso attivo.
              </div>
            ) : (
              alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                    alert.severity === 'urgent'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
                      {alert.severity === 'urgent'
                        ? 'warning'
                        : alert.severity === 'warning'
                        ? 'schedule'
                        : 'info'}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{alert.title}</span>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  {alert.dealId && (
                    <button
                      onClick={() => {
                        const targetDeal = opportunities.find((d) => d.id === alert.dealId);
                        if (targetDeal) setSelectedDeal(targetDeal);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary font-semibold text-[11px] border border-outline-variant/30 flex-shrink-0 shadow-sm"
                    >
                      Apri Scheda
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Stand-by & Snooze Status */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">snooze</span>
                <h3 className="font-headline font-bold text-lg text-on-surface">
                  Trattative in Stand-by
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('standby')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Gestione →
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Account congelati temporaneamente con sveglia e data di riattivazione automatica.
            </p>

            <div className="flex flex-col gap-2.5 mt-4">
              {standbyDeals.length === 0 ? (
                <div className="p-4 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                  Nessuna trattativa in stand-by al momento.
                </div>
              ) : (
                standbyDeals.slice(0, 3).map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 hover:border-primary/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getBrandBadge(deal.brand)}`}>
                          {deal.brand}
                        </span>
                        <span className="text-xs font-bold text-on-surface">{deal.name}</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant mt-0.5">
                        {deal.company} • Sveglia: {deal.standbyReactivationDate || 'Da definire'}
                      </span>
                    </div>
                    <span className="tabular-nums text-xs font-bold text-primary">
                      € {deal.value.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-surface-container rounded-xl flex items-center justify-between text-xs text-on-surface-variant">
            <span>Sveglia attiva:</span>
            <span className="font-bold text-on-surface">
              {standbyDeals.filter((d) => d.standbyReactivationDate && d.standbyReactivationDate <= today).length} da riattivare oggi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
