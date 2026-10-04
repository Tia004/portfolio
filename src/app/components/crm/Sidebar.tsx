'use client';
import React from 'react';
import { useCRM } from '@/lib/crm/store';
import { BrandLogo } from './BrandLogo';
export type ActiveTab = 'cockpit' | 'focus' | 'kanban' | 'opportunities' | 'calendar' | 'standby' | 'analytics';
interface Props { activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void; mobileOpen: boolean; onClose: () => void }
const items: { tab: ActiveTab; icon: string; label: string }[] = [
  { tab: 'cockpit', icon: 'space_dashboard', label: 'Panoramica' },
  { tab: 'focus', icon: 'filter_list', label: 'Focus' },
  { tab: 'kanban', icon: 'view_kanban', label: 'Pipeline' },
  { tab: 'opportunities', icon: 'work_outline', label: 'Opportunità' },
  { tab: 'calendar', icon: 'calendar_today', label: 'Attività' },
  { tab: 'standby', icon: 'notifications_none', label: 'Avvisi e stand-by' },
  { tab: 'analytics', icon: 'bar_chart', label: 'Analisi' },
];
export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab, mobileOpen, onClose }) => {
  const { alerts, brands, setIsNewDealModalOpen, setIsSettingsModalOpen } = useCRM();
  const urgent = alerts.filter((a) => a.severity === 'urgent').length;
  return <>
    {mobileOpen && <button className="sidebar-scrim" aria-label="Chiudi menu" onClick={onClose} />}
    <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Navigazione principale">
      <div className="sidebar-brand">
        <button className="brand-link" onClick={() => { setActiveTab('cockpit'); onClose(); }}>
          <BrandLogo size={28} />
          <span className="brand-copy"><strong>Hub Commerciale</strong><small>Workspace vendite</small></span>
        </button>
        <button className="mobile-close" aria-label="Chiudi menu" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
      </div>
      <div className="sidebar-body">
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav">
          {items.map(({ tab, icon, label }) => <button key={tab} onClick={() => { setActiveTab(tab); onClose(); }} className={`nav-item ${activeTab === tab ? 'active' : ''}`} aria-current={activeTab === tab ? 'page' : undefined}>
            <span className="material-symbols-outlined">{icon}</span><span>{label}</span>
            {tab === 'standby' && urgent > 0 && <span className="nav-count">{urgent}</span>}
          </button>)}
        </nav>
        <button className="sidebar-create" onClick={() => { setIsNewDealModalOpen(true); onClose(); }}><span className="material-symbols-outlined">add</span> Nuova opportunità</button>
      </div>
      <div className="sidebar-footer"><div className="sidebar-footer-head"><span className="footer-dot" /> {brands.length > 0 ? brands.slice(0, 3).join(' · ') + (brands.length > 3 ? ` (+${brands.length - 3})` : '') : 'Workspace vendite'}</div><p>Le informazioni del tuo team, in un solo spazio.</p><button onClick={() => { setIsSettingsModalOpen(true); onClose(); }}><span className="material-symbols-outlined">settings</span> Impostazioni</button></div>
    </aside>
  </>;
};
