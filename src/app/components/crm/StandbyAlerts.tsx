'use client';

import { italianDateKey, italianDateAfterDays } from '@/lib/crm/date';

import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { Opportunity } from '@/lib/crm/types';

export const StandbyAlerts: React.FC = () => {
  const {
    opportunities,
    alerts,
    setSelectedDeal,
    moveDealStage,
    snoozeDeal,
    triggerNextStepPrompt,
  } = useCRM();

  const today = italianDateKey();

  const [snoozeModalDeal, setSnoozeModalDeal] = useState<Opportunity | null>(null);
  const [snoozeReason, setSnoozeReason] = useState('Cliente in attesa di budget trimestrale');
  const [snoozeDate, setSnoozeDate] = useState(
    italianDateAfterDays(30)
  );

  const standbyDeals = opportunities.filter((d) => d.stage === 'Stand-by');

  const handleWakeUp = (deal: Opportunity) => {
    // Wake up: move to Trattativa and ask for next step!
    moveDealStage(deal.id, 'Trattativa');
  };

  const handleSaveSnooze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snoozeModalDeal) return;
    snoozeDeal(snoozeModalDeal.id, snoozeReason, snoozeDate);
    setSnoozeModalDeal(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-xl md:text-2xl text-on-surface tracking-tight">
              Controllo Stand-by & Alert Automatici
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container font-mono text-xs font-semibold text-primary">
              {alerts.length} Segnalazioni Attive
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Monitoraggio continuo di anomalie di vendita, trattative congelate con data sveglia e task scaduti
          </p>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alerts Feed */}
        <div className="lg:col-span-6 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500 text-[22px]">warning</span>
              <h2 className="font-headline font-bold text-lg text-on-surface">
                Anomalie Commerciali Rilevate
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-on-surface-variant">
              Auto-Audit attivo
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {alerts.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-low rounded-xl text-xs text-on-surface-variant flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[32px]">verified</span>
                <span className="font-bold text-on-surface">Nessuna anomalia riscontrata</span>
                <span>Tutti i lead hanno una prossima azione definita e nessun follow-up è in ritardo.</span>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 text-xs transition-all ${
                    alert.severity === 'urgent'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
                        {alert.type === 'no-next-action'
                          ? 'rule'
                          : alert.type === 'expired-followup'
                          ? 'history'
                          : alert.type === 'stuck-deal'
                          ? 'hourglass_empty'
                          : 'alarm'}
                      </span>
                      <div>
                        <span className="font-bold text-on-surface block text-xs">{alert.title}</span>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        alert.severity === 'urgent'
                          ? 'bg-rose-600 text-white'
                          : alert.severity === 'warning'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      Rilevato il: {alert.date}
                    </span>
                    {alert.dealId && (
                      <div className="flex items-center gap-2">
                        {alert.type === 'no-next-action' && (
                          <button
                            onClick={() => {
                              const deal = opportunities.find((d) => d.id === alert.dealId);
                              if (deal) triggerNextStepPrompt(deal);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors"
                          >
                            Pianifica Step
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const deal = opportunities.find((d) => d.id === alert.dealId);
                            if (deal) setSelectedDeal(deal);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:text-primary font-semibold text-[11px] border border-outline-variant/30 transition-colors"
                        >
                          Apri Scheda
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Stand-by Management */}
        <div className="lg:col-span-6 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">snooze</span>
              <h2 className="font-headline font-bold text-lg text-on-surface">
                Parcheggio Stand-by ({standbyDeals.length})
              </h2>
            </div>
            <span className="text-xs text-on-surface-variant">
              Auto-riattivazione programmata
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            Le opportunità in Stand-by non sono perse: attendono una finestra temporale concordata. Alla data indicata tornano automaticamente attive nel Cockpit quotidiano.
          </p>

          <div className="flex flex-col gap-3">
            {standbyDeals.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-low rounded-xl text-xs text-on-surface-variant">
                Nessuna opportunità attualmente in stand-by.
              </div>
            ) : (
              standbyDeals.map((deal) => {
                const isDueToday = deal.standbyReactivationDate && deal.standbyReactivationDate <= today;

                return (
                  <div
                    key={deal.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      isDueToday
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-surface-container-low border-outline-variant/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-on-surface">{deal.name}</span>
                          <span className="text-[11px] text-on-surface-variant">({deal.company})</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-container text-primary">
                            {deal.brand}
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant block mt-0.5 font-medium">
                          Motivo Stand-by: &quot;{deal.standbyReason || 'In attesa di riscontro'}&quot;
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-primary block">
                          € {deal.value.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          Sveglia: {deal.standbyReactivationDate || 'N/D'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
                      <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        {deal.salesRep}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSnoozeModalDeal(deal);
                            if (deal.standbyReason) setSnoozeReason(deal.standbyReason);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:text-primary font-semibold text-[11px] border border-outline-variant/30"
                        >
                          Modifica Sveglia
                        </button>
                        <button
                          onClick={() => handleWakeUp(deal)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[14px]">alarm_on</span>
                          <span>Riattiva Ora</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Standby Snooze Modal */}
      {snoozeModalDeal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl border border-outline-variant/40 flex flex-col gap-4">
            <h3 className="font-headline font-bold text-lg text-on-surface">
              Imposta Stand-by per {snoozeModalDeal.name}
            </h3>

            <form onSubmit={handleSaveSnooze} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-on-surface-variant block mb-1">
                  Motivo dello Stand-by *
                </label>
                <textarea
                  rows={2}
                  required
                  value={snoozeReason}
                  onChange={(e) => setSnoozeReason(e.target.value)}
                  placeholder="Es: Cliente interessato ma vuole riparlarne a gennaio..."
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">
                  Data di Riattivazione Automatica *
                </label>
                <input
                  type="date"
                  required
                  value={snoozeDate}
                  onChange={(e) => setSnoozeDate(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setSnoozeModalDeal(null)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90"
                >
                  Conferma Stand-by
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
