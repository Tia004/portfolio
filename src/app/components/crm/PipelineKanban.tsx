'use client';

import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { DealStage, Opportunity } from '@/lib/crm/types';
import { getBrandBadge } from '@/lib/crm/brandBadges';

const KANBAN_STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'Nuovo lead', label: '1. Nuovo Lead', color: 'border-blue-500/40 text-blue-500' },
  { key: 'Conoscenza', label: '2. Conoscenza', color: 'border-cyan-500/40 text-cyan-500' },
  { key: 'Appuntamento', label: '3. Appuntamento', color: 'border-amber-500/40 text-amber-500' },
  { key: 'Trattativa', label: '4. Trattativa', color: 'border-purple-500/40 text-purple-500' },
  { key: 'Chiusura', label: '5. Chiusura', color: 'border-indigo-500/40 text-indigo-500' },
  { key: 'Venduta', label: 'Venduta (Vinta)', color: 'border-emerald-500/40 text-emerald-500' },
  { key: 'Stand-by', label: 'Stand-by', color: 'border-slate-500/40 text-slate-500' },
  { key: 'Persa', label: 'Persa', color: 'border-rose-500/40 text-rose-500' },
];

export const PipelineKanban: React.FC = () => {
  const {
    opportunities,
    moveDealStage,
    setSelectedDeal,
    selectedBrand,
    selectedRep,
    searchQuery,
    setIsNewDealModalOpen,
  } = useCRM();

  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Filter deals
  const filteredDeals = opportunities.filter((deal) => {
    if (selectedBrand !== 'all' && deal.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
    if (selectedRep !== 'all' && !deal.salesRep.toLowerCase().includes(selectedRep.toLowerCase())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        deal.name.toLowerCase().includes(q) ||
        deal.company.toLowerCase().includes(q) ||
        deal.service.toLowerCase().includes(q) ||
        deal.brand.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (dealId) {
      moveDealStage(dealId, targetStage);
    }
    setDraggedDealId(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Top Bar Kanban Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-xl md:text-2xl text-on-surface tracking-tight">
              Pipeline Commerciale Kanban
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-surface-container tabular-nums text-xs font-semibold text-primary">
              {filteredDeals.length} Opportunità
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Trascina le card tra le fasi per avanzare le trattative. Ogni avanzamento richiede un prossimo step.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewDealModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3.5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nuovo Lead</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Kanban Columns */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-[2100px] items-start">
          {KANBAN_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage.key);
            const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div
                key={stage.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
                className="w-[280px] flex-shrink-0 flex flex-col gap-3 bg-surface-container-low rounded-2xl p-3 border border-outline-variant/30 min-h-[500px]"
              >
                {/* Stage Header */}
                <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                      {stage.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-bold tabular-nums text-primary">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
                    <span>Totale:</span>
                    <span className="font-bold text-on-surface">
                      € {stageTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Stage Cards List */}
                <div className="flex flex-col gap-3 flex-1">
                  {stageDeals.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-outline-variant/40 rounded-xl flex items-center justify-center text-xs text-outline text-center p-2">
                      Trascina qui le trattative per spostarle in {stage.label}
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const hasNextAction = deal.nextAction && deal.nextAction.what && !deal.nextAction.completed;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onClick={() => setSelectedDeal(deal)}
                          className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/30 hover:border-primary/50 cursor-pointer transition-all hover:shadow-md flex flex-col gap-2.5 group"
                        >
                          {/* Brand & Value Header */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBrandBadge(deal.brand)}`}>
                              {deal.brand}
                            </span>
                            <div className="text-right">
                              <span className="tabular-nums text-xs font-bold text-primary block leading-tight">
                                € {deal.value.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-on-surface-variant font-medium">
                                {deal.valueType}
                              </span>
                            </div>
                          </div>

                          {/* Client & Company */}
                          <div>
                            <span className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors block">
                              {deal.name}
                            </span>
                            <span className="text-[11px] text-on-surface-variant font-medium block">
                              {deal.company}
                            </span>
                          </div>

                          {/* Service interested */}
                          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-lg">
                            <span className="material-symbols-outlined text-[13px] text-outline">
                              design_services
                            </span>
                            <span className="truncate">{deal.service}</span>
                          </div>

                          {/* Mandatory Regola Prossima Azione Card Section */}
                          <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-1">
                            {hasNextAction ? (
                              <div className="flex items-start gap-1.5 text-[11px]">
                                <span className="material-symbols-outlined text-[14px] text-emerald-500 mt-0.5 flex-shrink-0">
                                  event_upcoming
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-on-surface line-clamp-1">
                                    {deal.nextAction?.what}
                                  </span>
                                  <span className="text-[10px] tabular-nums text-on-surface-variant">
                                    {deal.nextAction?.when} {deal.nextAction?.time || ''} • {deal.nextAction?.who}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-lg">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                <span>Manca Prossima Azione!</span>
                              </div>
                            )}
                          </div>

                          {/* Footer with Sales Rep */}
                          <div className="flex items-center justify-between pt-1 text-[10px] text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">person</span>
                              {deal.salesRep}
                            </span>
                            <span className="text-outline tabular-nums text-[9px]">
                              {deal.id}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
