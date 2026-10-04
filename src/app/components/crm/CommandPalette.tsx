'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import type { ActiveTab } from './Sidebar';

const destinations: { tab: ActiveTab; label: string; icon: string }[] = [
  { tab: 'cockpit', label: 'Panoramica', icon: 'space_dashboard' },
  { tab: 'focus', label: 'Focus commerciale', icon: 'filter_list' },
  { tab: 'kanban', label: 'Pipeline', icon: 'view_kanban' },
  { tab: 'opportunities', label: 'Opportunità', icon: 'work_outline' },
  { tab: 'calendar', label: 'Attività', icon: 'calendar_today' },
  { tab: 'standby', label: 'Avvisi e stand-by', icon: 'notifications_none' },
  { tab: 'analytics', label: 'Analisi', icon: 'bar_chart' },
];
export const CommandPalette: React.FC<{ open: boolean; onClose: () => void; onNavigate: (tab: ActiveTab) => void }> = ({ open, onClose, onNavigate }) => {
  const { opportunities, tasks, setSelectedDeal, setIsNewDealModalOpen, setIsSettingsModalOpen } = useCRM();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  useEffect(() => { if (open) { setQuery(''); setIndex(0); } }, [open]);
  const entries = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('it-IT');
    const result: { key: string; label: string; detail: string; icon: string; action: () => void }[] = [];
    for (const item of destinations) if (!q || item.label.toLowerCase().includes(q)) result.push({ key: item.tab, label: item.label, detail: 'Vista', icon: item.icon, action: () => onNavigate(item.tab) });
    if (!q || 'nuova opportunità'.includes(q)) result.push({ key: 'new', label: 'Nuova opportunità', detail: 'Azione', icon: 'add', action: () => setIsNewDealModalOpen(true) });
    if (!q || 'impostazioni'.includes(q)) result.push({ key: 'settings', label: 'Impostazioni', detail: 'Azione', icon: 'settings', action: () => setIsSettingsModalOpen(true) });
    if (q) {
      for (const deal of opportunities.filter((deal) => [deal.name, deal.company, deal.service, deal.id].some((value) => String(value || '').toLowerCase().includes(q))).slice(0, 8)) result.push({ key: deal.id, label: deal.company || deal.name, detail: deal.name + ' · ' + deal.brand, icon: 'work_outline', action: () => setSelectedDeal(deal) });
      for (const task of tasks.filter((task) => task.status !== 'Completata' && [task.title, task.client].some((value) => String(value || '').toLowerCase().includes(q))).slice(0, 5)) result.push({ key: task.id, label: task.title, detail: task.client + ' · ' + task.date, icon: 'event_note', action: () => { const deal = opportunities.find((item) => item.id === task.dealId); if (deal) setSelectedDeal(deal); else onNavigate('calendar'); } });
    }
    return result;
  }, [query, opportunities, tasks, onNavigate, setSelectedDeal, setIsNewDealModalOpen, setIsSettingsModalOpen]);
  if (!open) return null;
  const activate = (at: number) => { entries[at]?.action(); onClose(); };
  return <div className="command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="command-dialog" role="dialog" aria-modal="true" aria-label="Ricerca globale">
      <div className="command-input-row"><span className="material-symbols-outlined">search</span><input autoFocus placeholder="Cerca viste, clienti, attività…" aria-label="Cerca nel workspace" value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(value + 1, entries.length - 1)); } if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(value - 1, 0)); } if (event.key === 'Enter') { event.preventDefault(); activate(index); } }} /><kbd>ESC</kbd></div>
      <div className="command-results">{entries.length ? entries.map((entry, at) => <button key={entry.key} className={index === at ? 'active' : ''} onMouseEnter={() => setIndex(at)} onClick={() => activate(at)}><span className="material-symbols-outlined">{entry.icon}</span><span><strong>{entry.label}</strong><small>{entry.detail}</small></span><span className="material-symbols-outlined command-arrow">north_west</span></button>) : <p>Nessun risultato. Prova un altro termine.</p>}</div>
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> naviga</span><span><kbd>↵</kbd> apri</span><span><kbd>ESC</kbd> chiudi</span></div>
    </div>
  </div>;
};
