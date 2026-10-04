'use client';

import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { Opportunity } from '@/lib/crm/types';
import { CustomDropdown, DropdownOption } from './CustomDropdown';

export const AnalyticsView: React.FC = () => {
  const { opportunities, brands, salesReps } = useCRM();

  const [period, setPeriod] = useState<string>('YTD');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterRep, setFilterRep] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Filtered dataset
  const filtered = opportunities.filter((deal) => {
    if (filterBrand !== 'all' && deal.brand.toLowerCase() !== filterBrand.toLowerCase()) return false;
    if (filterRep !== 'all' && !deal.salesRep.toLowerCase().includes(filterRep.toLowerCase())) return false;
    if (filterSource !== 'all' && deal.leadSource !== filterSource) return false;
    return true;
  });

  const getNormalizedValue = (deal: Opportunity) => {
    if (deal.valueType === 'Mensile') return deal.value * 12;
    return deal.value;
  };

  // Metrics
  const soldTotal = filtered
    .filter((d) => d.stage === 'Venduta')
    .reduce((sum, d) => sum + getNormalizedValue(d), 0);

  const pipelineTotal = filtered
    .filter((d) => d.stage !== 'Venduta' && d.stage !== 'Persa')
    .reduce((sum, d) => sum + getNormalizedValue(d), 0);

  const totalLeads = filtered.length;
  const closedWon = filtered.filter((d) => d.stage === 'Venduta').length;
  const closedLost = filtered.filter((d) => d.stage === 'Persa').length;
  const totalClosed = closedWon + closedLost;
  const winRate = totalClosed > 0 ? Math.round((closedWon / totalClosed) * 100) : 0;
  const avgTicket = closedWon > 0 ? Math.round(soldTotal / closedWon) : 0;

  // Distribution by stage
  const stages = ['Nuovo lead', 'Conoscenza', 'Appuntamento', 'Trattativa', 'Chiusura', 'Venduta', 'Stand-by', 'Persa'];
  const stageCounts = stages.map((st) => ({
    stage: st,
    count: filtered.filter((d) => d.stage === st).length,
    value: filtered.filter((d) => d.stage === st).reduce((sum, d) => sum + getNormalizedValue(d), 0),
  }));

  // Distribution by Brand
  const brandStats = brands.map((b) => {
    const brandDeals = opportunities.filter((d) => d.brand.toLowerCase() === b.toLowerCase());
    const sold = brandDeals.filter((d) => d.stage === 'Venduta').reduce((sum, d) => sum + getNormalizedValue(d), 0);
    const pipe = brandDeals.filter((d) => d.stage !== 'Venduta' && d.stage !== 'Persa').reduce((sum, d) => sum + getNormalizedValue(d), 0);
    return {
      brand: b,
      count: brandDeals.length,
      sold,
      pipeline: pipe,
    };
  });

  // Distribution by Source
  const sources = Array.from(new Set(opportunities.map((d) => d.leadSource)));
  const sourceStats = sources.map((src) => ({
    source: src,
    count: filtered.filter((d) => d.leadSource === src).length,
    sold: filtered.filter((d) => d.leadSource === src && d.stage === 'Venduta').reduce((sum, d) => sum + getNormalizedValue(d), 0),
  }));

  // Rep Performance
  const repStats = salesReps.map((rep) => {
    const repDeals = opportunities.filter((d) => d.salesRep.includes(rep.name.split(' ')[0]));
    const won = repDeals.filter((d) => d.stage === 'Venduta').length;
    const lost = repDeals.filter((d) => d.stage === 'Persa').length;
    const sold = repDeals.filter((d) => d.stage === 'Venduta').reduce((sum, d) => sum + getNormalizedValue(d), 0);
    const pipe = repDeals.filter((d) => d.stage !== 'Venduta' && d.stage !== 'Persa').reduce((sum, d) => sum + getNormalizedValue(d), 0);
    const repWinRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    return {
      name: rep.name,
      role: rep.role,
      won,
      sold,
      pipe,
      winRate: repWinRate,
    };
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Top Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div>
          <h1 className="font-headline font-bold text-xl md:text-2xl text-on-surface tracking-tight">
            Analytics & Performance Commerciale
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Analisi approfondita del venduto, pipeline, conversioni per brand, fonte lead e rendimento sales rep
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/30 shadow-sm text-xs">
            {['YTD', 'Q1', 'Q2', 'Q3', 'Q4'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  period === p
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Brand filter */}
          <div className="w-[155px]">
            <CustomDropdown
              size="sm"
              value={filterBrand}
              onChange={(val) => setFilterBrand(val)}
              options={[
                { value: 'all', label: 'Tutti i Brand' },
                ...brands.map((b) => ({ value: b, label: b })),
              ]}
            />
          </div>

          {/* Rep filter */}
          <div className="w-[165px]">
            <CustomDropdown
              size="sm"
              value={filterRep}
              onChange={(val) => setFilterRep(val)}
              options={[
                { value: 'all', label: 'Tutti i Commerciali' },
                ...salesReps.map((r) => ({ value: r.name, label: r.name })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Venduto Concluso
          </span>
          <div className="font-headline font-bold text-2xl text-on-surface mt-1 tabular-nums">
            € {soldTotal.toLocaleString()}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2 block">
            {closedWon} accordi vinti
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Valore Pipeline Attiva
          </span>
          <div className="font-headline font-bold text-2xl text-on-surface mt-1 tabular-nums">
            € {pipelineTotal.toLocaleString()}
          </div>
          <span className="text-xs text-primary font-semibold mt-2 block">
            {filtered.filter((d) => d.stage !== 'Venduta' && d.stage !== 'Persa').length} trattative aperte
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Win-Rate Globale
          </span>
          <div className="font-headline font-bold text-2xl text-on-surface mt-1 tabular-nums">
            {winRate}%
          </div>
          <span className="text-xs text-on-surface-variant font-medium mt-2 block">
            Su {totalClosed} trattative concluse
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Ticket Medio Vinto
          </span>
          <div className="font-headline font-bold text-2xl text-on-surface mt-1 tabular-nums">
            € {avgTicket.toLocaleString()}
          </div>
          <span className="text-xs text-on-surface-variant font-medium mt-2 block">
            Per accordo commercializzato
          </span>
        </div>
      </div>

      {/* Grid: Funnel & Brand Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stage Funnel Distribution */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-base text-on-surface">
              Distribuzione Trattative per Fase (Funnel)
            </h3>
            <span className="text-xs tabular-nums text-outline">{totalLeads} Totali</span>
          </div>

          <div className="flex flex-col gap-3">
            {stageCounts.map((item) => {
              const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
              return (
                <div key={item.stage} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{item.stage}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-on-surface-variant">€ {item.value.toLocaleString()}</span>
                      <span className="font-bold text-primary">({item.count})</span>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Brand Comparison */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-base text-on-surface">
              Confronto Portfolio Brand
            </h3>
            <span className="text-xs text-on-surface-variant">{brands.length ? `${brands.length} brand gestiti` : 'Portfolio'}</span>
          </div>

          <div className="flex flex-col gap-4">
            {brandStats.map((item) => (
              <div
                key={item.brand}
                className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-headline font-bold text-sm text-on-surface">
                    {item.brand}
                  </span>
                  <span className="text-xs tabular-nums font-bold text-primary">
                    {item.count} Opportunità
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20 text-xs">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                      Venduto Concluso
                    </span>
                    <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      € {item.sold.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                      Pipeline Aperta
                    </span>
                    <span className="tabular-nums font-bold text-primary">
                      € {item.pipeline.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rep Performance Table */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
        <h3 className="font-headline font-bold text-base text-on-surface">
          Performance Commerciali del Team
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Ruolo</th>
                <th className="py-3 px-4">Accordi Vinti</th>
                <th className="py-3 px-4">Fatturato Vinto (€)</th>
                <th className="py-3 px-4">Pipeline Attiva (€)</th>
                <th className="py-3 px-4 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {repStats.map((r, i) => (
                <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-on-surface">{r.name}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{r.role}</td>
                  <td className="py-3 px-4 tabular-nums font-semibold">{r.won}</td>
                  <td className="py-3 px-4 tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    € {r.sold.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 tabular-nums font-bold text-primary">
                    € {r.pipe.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-on-surface">
                    {r.winRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
