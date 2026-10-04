'use client';

import { italianDateKey } from '@/lib/crm/date';

import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { ActivityType, Priority } from '@/lib/crm/types';
import { CustomDropdown } from './CustomDropdown';

export const NextStepModal: React.FC = () => {
  const { nextStepModalDeal, setNextStepModalDeal, setDealNextAction, salesReps } = useCRM();

  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [when, setWhen] = useState(italianDateKey());
  const [time, setTime] = useState('11:00');
  const [type, setType] = useState<ActivityType>('chiamata');
  const [priority, setPriority] = useState<Priority>('Alta');

  React.useEffect(() => {
    if (nextStepModalDeal) {
      setWho(nextStepModalDeal.salesRep || salesReps[0]?.name || 'Commerciale');
      setWhat('');
    }
  }, [nextStepModalDeal, salesReps]);

  if (!nextStepModalDeal) return null;
  const canDismiss = nextStepModalDeal.stage === 'Venduta' || nextStepModalDeal.stage === 'Persa' || !!(nextStepModalDeal.nextAction?.what && !nextStepModalDeal.nextAction.completed);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) return;

    setDealNextAction(nextStepModalDeal.id, {
      what,
      who: who || nextStepModalDeal.salesRep,
      when,
      time,
      type,
      priority,
    });

    setNextStepModalDeal(null);
    setWhat('');
  };

  const quickTemplates = [
    'Richiamare dopo invio preventivo',
    'Video call strategica con decisori',
    'Follow-up su approvazione budget',
    'Inviare accordo contrattuale per firma',
    'Verifica accredito anticipo e kick-off',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="modal-card bg-[#14151a] max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col gap-5 animate-scale-up">
        {/* Header with rule badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Regola Fondamentale del CRM
              </span>
              <h3 className="font-headline font-bold text-xl text-on-surface">
                Qual è il prossimo step?
              </h3>
            </div>
          </div>
          {canDismiss && <button
            onClick={() => setNextStepModalDeal(null)}
            aria-label="Chiudi"
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface"
          >
            ✕
          </button>}
        </div>

        {/* Deal Context Info */}
        <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="font-bold text-on-surface text-sm">{nextStepModalDeal.name}</span>
            <span className="text-[11px] text-on-surface-variant">
              {nextStepModalDeal.company} • {nextStepModalDeal.brand} ({nextStepModalDeal.stage})
            </span>
          </div>
          <span className="tabular-nums font-bold text-primary text-xs">
            Valore: € {nextStepModalDeal.value.toLocaleString()}
          </span>
        </div>

        {/* Quick template suggestions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
            Suggerimenti Rapidi:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickTemplates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setWhat(tpl)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/20"
              >
                + {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Next Step Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="font-bold text-on-surface-variant block mb-1">
              Cosa bisogna fare? *
            </label>
            <input
              type="text"
              required
              placeholder="Es: Richiamare Mario Rossi per conferma preventivo"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/30 text-on-surface outline-none font-medium focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Chi deve farlo? *
              </label>
              <CustomDropdown
                value={who}
                onChange={(val) => setWho(val)}
                options={salesReps.map((r) => ({ value: r.name, label: r.name, icon: 'person' }))}
              />
            </div>

            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Tipologia Attività *
              </label>
              <CustomDropdown
                value={type}
                onChange={(val) => setType(val as any)}
                options={[
                  { value: 'chiamata', label: 'Chiamata Telefonica', icon: 'call' },
                  { value: 'appuntamento', label: 'Video Call / Appuntamento', icon: 'video_camera_front' },
                  { value: 'preventivo', label: 'Invio Preventivo', icon: 'description' },
                  { value: 'follow-up', label: 'Follow-up', icon: 'alarm_on' },
                  { value: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
                  { value: 'task', label: 'Task Commerciale', icon: 'task_alt' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Quando (Data) *
              </label>
              <input
                type="date"
                required
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Ora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Priorità
              </label>
              <CustomDropdown
                value={priority}
                onChange={(val) => setPriority(val as any)}
                options={[
                  { value: 'Alta', label: 'Alta' },
                  { value: 'Media', label: 'Media' },
                  { value: 'Bassa', label: 'Bassa' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20 mt-2">
            {canDismiss && <button
              type="button"
              onClick={() => setNextStepModalDeal(null)}
              className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface font-semibold"
            >
              Posticipa
            </button>}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Salva Prossimo Step</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
