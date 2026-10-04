'use client';

import { italianDateAfterDays } from '@/lib/crm/date';

import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { Opportunity, DealStage, ActivityType } from '@/lib/crm/types';
import { CustomDropdown, DropdownOption } from './CustomDropdown';

export const DealModal: React.FC = () => {
  const {
    selectedDeal,
    setSelectedDeal,
    updateOpportunity,
    moveDealStage,
    addDealHistoryLog,
    triggerNextStepPrompt,
    snoozeDeal,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'timeline' | 'edit' | 'quote'>('timeline');
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogDesc, setNewLogDesc] = useState('');
  const [newLogType, setNewLogType] = useState<ActivityType>('chiamata');

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editValue, setEditValue] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Standby quick state
  const [isStandbyOpen, setIsStandbyOpen] = useState(false);
  const [standbyReason, setStandbyReason] = useState('');
  const [standbyDate, setStandbyDate] = useState(
    italianDateAfterDays(30)
  );

  // Quotation Generator state
  const [quoteItems, setQuoteItems] = useState<{ name: string; price: number; quantity: number }[]>([]);

  React.useEffect(() => {
    if (selectedDeal) {
      setEditName(selectedDeal.name);
      setEditCompany(selectedDeal.company);
      setEditValue(selectedDeal.value);
      setEditPhone(selectedDeal.phone);
      setEditWhatsapp(selectedDeal.whatsapp);
      setEditEmail(selectedDeal.email);
      setEditNotes(selectedDeal.notes);
      setQuoteItems([{ name: selectedDeal.service, price: selectedDeal.value, quantity: 1 }]);
    }
  }, [selectedDeal]);

  if (!selectedDeal) return null;

  const stages: DealStage[] = [
    'Nuovo lead',
    'Conoscenza',
    'Appuntamento',
    'Trattativa',
    'Chiusura',
    'Venduta',
    'Stand-by',
    'Persa',
  ];

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim()) return;

    addDealHistoryLog(selectedDeal.id, {
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      title: newLogTitle,
      description: newLogDesc,
      type: newLogType,
      author: selectedDeal.salesRep,
    });

    setNewLogTitle('');
    setNewLogDesc('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOpportunity(selectedDeal.id, {
      name: editName,
      company: editCompany,
      value: editValue,
      phone: editPhone,
      whatsapp: editWhatsapp,
      email: editEmail,
      notes: editNotes,
    });
    setActiveTab('timeline');
  };

  const handleConfirmStandby = (e: React.FormEvent) => {
    e.preventDefault();
    snoozeDeal(selectedDeal.id, standbyReason, standbyDate);
    setIsStandbyOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-surface-container-lowest max-w-4xl w-full rounded-3xl shadow-2xl border border-outline-variant/40 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Modal Top Bar */}
        <div className="p-6 bg-surface-container-low border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined">domain</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline font-bold text-xl text-on-surface">
                  {selectedDeal.name}
                </span>
                <span className="text-on-surface-variant font-medium text-sm">
                  — {selectedDeal.company}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-bold text-[10px] uppercase tracking-wider">
                  {selectedDeal.brand}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1 flex-wrap">
                <span className="font-semibold text-on-surface">{selectedDeal.service}</span>
                <span>•</span>
                <span>Resp: <strong className="text-on-surface">{selectedDeal.salesRep}</strong></span>
                <span>•</span>
                <span>Fonte: <strong>{selectedDeal.leadSource}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="text-right tabular-nums">
              <span className="text-xl font-bold text-primary block leading-tight">
                € {selectedDeal.value.toLocaleString()}
              </span>
              <span className="text-[10px] text-on-surface-variant">
                {selectedDeal.valueType}
              </span>
            </div>
            <button
              onClick={() => setSelectedDeal(null)}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stage Stepper Progress Bar */}
        <div className="px-6 py-3 bg-surface-container border-b border-outline-variant/20 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[700px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline mr-2">
              Fase:
            </span>
            {stages.map((st, idx) => (
              <button
                key={st}
                onClick={() => st === 'Stand-by' ? setIsStandbyOpen(true) : moveDealStage(selectedDeal.id, st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  selectedDeal.stage === st
                    ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{st}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Contact Strip */}
        <div className="px-6 py-3 bg-surface-container-low/50 border-b border-outline-variant/20 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            {selectedDeal.whatsapp && (
              <a
                href={`https://wa.me/${selectedDeal.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>WhatsApp: {selectedDeal.whatsapp}</span>
              </a>
            )}

            {selectedDeal.phone && (
              <a
                href={`tel:${selectedDeal.phone}`}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>Chiama: {selectedDeal.phone}</span>
              </a>
            )}

            {selectedDeal.email && (
              <a
                href={`mailto:${selectedDeal.email}`}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span>{selectedDeal.email}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStandbyOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">snooze</span>
              <span>Metti in Stand-by</span>
            </button>

            <button
              onClick={() => triggerNextStepPrompt(selectedDeal)}
              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold flex items-center gap-1 shadow-sm hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">update</span>
              <span>Pianifica Prossimo Step</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 px-6 pt-4 border-b border-white/[0.08] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            <span>Storico Cronologico & Note</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'edit'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Dati Trattativa & Anagrafica</span>
          </button>

          <button
            onClick={() => setActiveTab('quote')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quote'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Generatore Preventivo & Offerta</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="flex flex-col gap-6">
              {/* Mandatory Next Action Status Banner */}
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">flag</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                      Regola Fondamentale: Prossima Azione Attiva
                    </span>
                    {selectedDeal.nextAction && selectedDeal.nextAction.what && !selectedDeal.nextAction.completed ? (
                      <div className="text-xs font-bold text-on-surface mt-0.5">
                        {selectedDeal.nextAction.what}
                        <span className="block text-[11px] tabular-nums text-on-surface-variant mt-0.5">
                          Data prevista: {selectedDeal.nextAction.when} {selectedDeal.nextAction.time || ''} • Assegnato a: {selectedDeal.nextAction.who}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        Nessuna prossima azione attiva! La trattativa rischia di perdersi.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => triggerNextStepPrompt(selectedDeal)}
                  className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-all flex-shrink-0"
                >
                  Aggiorna Step
                </button>
              </div>

              {/* Add New Note or Activity log form */}
              <form onSubmit={handleAddLog} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3 text-xs">
                <span className="font-bold text-on-surface">Registra Attività o Nota Commerciale</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Titolo evento (es: Chiamata conoscitiva, inviata demo...)"
                      value={newLogTitle}
                      onChange={(e) => setNewLogTitle(e.target.value)}
                      className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <CustomDropdown
                      value={newLogType}
                      onChange={(val) => setNewLogType(val as any)}
                      options={[
                        { value: 'chiamata', label: 'Chiamata Effettuata', icon: 'call' },
                        { value: 'appuntamento', label: 'Video Call / Meeting', icon: 'videocam' },
                        { value: 'preventivo', label: 'Preventivo Inviato', icon: 'request_quote' },
                        { value: 'follow-up', label: 'Follow-up', icon: 'history' },
                        { value: 'whatsapp', label: 'WhatsApp Inviato', icon: 'chat' },
                        { value: 'task', label: 'Nota Interna', icon: 'edit_note' },
                      ]}
                    />
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Dettagli e note della conversazione..."
                  value={newLogDesc}
                  onChange={(e) => setNewLogDesc(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-sm hover:opacity-90"
                  >
                    Aggiungi alla Timeline
                  </button>
                </div>
              </form>

              {/* Chronological Timeline feed */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Cronologia Eventi ({selectedDeal.history?.length || 0})
                </span>

                <div className="relative pl-6 border-l border-white/10 flex flex-col gap-4 mt-2">
                  {selectedDeal.history?.map((h) => (
                    <div key={h.id} className="relative flex flex-col gap-1 text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-300 border border-[#14151a]" />
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-zinc-400 text-[11px]">
                          {h.date}
                        </span>
                        <span className="font-bold text-on-surface">{h.title}</span>
                        <span className="text-[10px] text-outline">• {h.author}</span>
                      </div>
                      {h.description && (
                        <p className="text-[11px] text-on-surface-variant leading-relaxed bg-surface-container-low/60 p-2.5 rounded-xl border border-outline-variant/20">
                          {h.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT DEAL */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Nome e Cognome *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Azienda *</label>
                <input
                  type="text"
                  required
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Valore Trattativa (€) *</label>
                <input
                  type="number"
                  required
                  value={editValue}
                  onChange={(e) => setEditValue(Number(e.target.value))}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Telefono</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-on-surface-variant block mb-1">Note Strategiche</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none resize-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-sm hover:opacity-90"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: QUOTE GENERATOR */}
          {activeTab === 'quote' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline font-bold text-sm text-on-surface">
                    Generatore Preventivo Commerciale ({selectedDeal.brand})
                  </h4>
                  <span className="tabular-nums font-bold text-primary text-sm">
                    Totale Offerta: € {selectedDeal.value.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Crea al volo la proposta commerciale formattata per {selectedDeal.company}.
                </p>

                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 tabular-nums text-[11px] whitespace-pre-wrap">
{`PROPOSTA COMMERCIALE ${selectedDeal.brand.toUpperCase()}
Cliente: ${selectedDeal.name} - ${selectedDeal.company}
Data: ${new Date().toLocaleDateString('it-IT')}
Servizio: ${selectedDeal.service}
Valore: € ${selectedDeal.value.toLocaleString()} (${selectedDeal.valueType})

Descrizione:
Attività strategica di erogazione servizi per il brand ${selectedDeal.brand}.
Termini: 50% all'avvio, 50% al completamento.
Validità offerta: 15 giorni.`}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Preventivo ${selectedDeal.brand} per ${selectedDeal.company}: €${selectedDeal.value}`);
                      alert('Testo offerta copiato negli appunti!');
                    }}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copia Testo Offerta</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Standby Modal Drawer */}
      {isStandbyOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl border border-outline-variant/40 flex flex-col gap-4">
            <h3 className="font-headline font-bold text-lg text-on-surface">
              Metti in Stand-by
            </h3>
            <p className="text-xs text-on-surface-variant">
              Specifica il motivo e la data di riattivazione automatica per {selectedDeal.name}.
            </p>

            <form onSubmit={handleConfirmStandby} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Motivo *</label>
                <textarea
                  rows={2}
                  required
                  value={standbyReason}
                  onChange={(e) => setStandbyReason(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface-variant block mb-1">Data Riattivazione *</label>
                <input
                  type="date"
                  required
                  value={standbyDate}
                  onChange={(e) => setStandbyDate(e.target.value)}
                  className="w-full bg-surface-container p-2.5 rounded-xl border border-outline-variant/30 text-on-surface outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsStandbyOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold shadow-sm hover:bg-amber-700"
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
