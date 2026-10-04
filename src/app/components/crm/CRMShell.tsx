'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider } from '@/lib/crm/auth';
import { CRMProvider, useCRM } from '@/lib/crm/store';
import { ExecutiveCockpit } from './ExecutiveCockpit';
import { PipelineKanban } from './PipelineKanban';
import { OpportunitiesList } from './OpportunitiesList';
import { CalendarView } from './CalendarView';
import { StandbyAlerts } from './StandbyAlerts';
import { AnalyticsView } from './AnalyticsView';
import { DealModal } from './DealModal';
import { NextStepModal } from './NextStepModal';
import { NewDealModal } from './NewDealModal';
import { SettingsMcpModal } from './SettingsMcpModal';
import { SalesFocus } from './SalesFocus';
import { CommandPalette } from './CommandPalette';

type CRMTab = 'cockpit' | 'kanban' | 'focus' | 'opportunities' | 'calendar' | 'standby' | 'crm-analytics';

function CRMInner() {
  const { dataReady, syncStatus } = useCRM();
  const [activeTab, setActiveTab] = useState<CRMTab>('cockpit');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!dataReady && syncStatus === 'loading') {
    return (
      <div className="crm-shell-loading">
        <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
        <p className="text-xs text-neutral-400 mt-3 font-mono">Caricamento CRM Commerciale…</p>
      </div>
    );
  }

  if (!dataReady && syncStatus === 'error') {
    return (
      <div className="crm-shell-loading">
        <p className="text-sm text-red-400 font-semibold">Impossibile caricare il CRM</p>
        <p className="text-xs text-neutral-500 mt-1">Controlla la connessione al database</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs font-semibold"
        >
          Riprova
        </button>
      </div>
    );
  }

  const tabs: { id: CRMTab; label: string; icon: string }[] = [
    { id: 'cockpit', label: 'Cockpit', icon: '◈' },
    { id: 'kanban', label: 'Pipeline', icon: '⬛' },
    { id: 'opportunities', label: 'Opportunità', icon: '◎' },
    { id: 'focus', label: 'Focus', icon: '◉' },
    { id: 'calendar', label: 'Calendario', icon: '▦' },
    { id: 'standby', label: 'Stand-by', icon: '◷' },
    { id: 'crm-analytics', label: 'Analytics', icon: '▲' },
  ];

  return (
    <div className="crm-shell" data-theme="slate">
      {/* CRM Sub-Nav */}
      <div className="crm-subnav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`crm-subnav-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="crm-subnav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="crm-sync-dot" data-status={syncStatus} title={`Sync: ${syncStatus}`} />
          <span className="text-[10px] text-neutral-500 font-mono hidden sm:block">{syncStatus}</span>
          <button
            onClick={() => setPaletteOpen(true)}
            className="crm-cmd-btn"
            title="Command palette (⌘J)"
          >
            <span className="text-[10px] font-mono opacity-60">⌘J</span>
          </button>
        </div>
      </div>

      {/* CRM Content */}
      <div className="crm-content">
        {activeTab === 'cockpit' && (
          <ExecutiveCockpit onNavigateToTab={(t) => setActiveTab(t as CRMTab)} />
        )}
        {activeTab === 'kanban' && <PipelineKanban />}
        {activeTab === 'focus' && <SalesFocus />}
        {activeTab === 'opportunities' && <OpportunitiesList />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'standby' && <StandbyAlerts />}
        {activeTab === 'crm-analytics' && <AnalyticsView />}
      </div>

      {/* Modals */}
      <DealModal />
      <NextStepModal />
      <NewDealModal />
      <SettingsMcpModal />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(t) => setActiveTab(t as CRMTab)}
      />
    </div>
  );
}

export default function CRMShell() {
  return (
    <AuthProvider>
      <CRMProvider>
        <CRMInner />
      </CRMProvider>
    </AuthProvider>
  );
}
