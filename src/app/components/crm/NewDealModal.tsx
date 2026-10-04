'use client';

import { italianDateKey } from '@/lib/crm/date';
import React, { useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { useAuth } from '@/lib/crm/auth';
import { Brand, ValueType, DealStage, ActivityType, Priority } from '@/lib/crm/types';
import { INITIAL_SERVICES } from '@/lib/crm/initialData';
import { CustomDropdown, DropdownOption } from './CustomDropdown';

export const NewDealModal: React.FC = () => {
  const { isNewDealModalOpen, setIsNewDealModalOpen, addOpportunity, brands, addBrand, salesReps } = useCRM();
  const { user } = useAuth();

  const defaultRep = user?.name || salesReps[0]?.name || 'Commerciale';

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [brand, setBrand] = useState<Brand>(brands[0] || '');
  const [service, setService] = useState('Consulenza');
  const [leadSource, setLeadSource] = useState('Non specificata');
  const [salesRep, setSalesRep] = useState(defaultRep);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [value, setValue] = useState<number>(0);
  const [valueType, setValueType] = useState<ValueType>('One Shot');
  const [stage] = useState<DealStage>('Nuovo lead');
  const [notes, setNotes] = useState('');

  // Mandatory Next Action fields
  const [actionWhat, setActionWhat] = useState('Primo contatto conoscitivo di qualifica');
  const [actionWho, setActionWho] = useState(defaultRep);
  const [actionWhen, setActionWhen] = useState(italianDateKey());
  const [actionTime] = useState('11:30');
  const [actionType, setActionType] = useState<ActivityType>('chiamata');
  const [actionPriority, setActionPriority] = useState<Priority>('Alta');

  if (!isNewDealModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company || !actionWhat) return;

    const effectiveBrand = brand.trim() || 'Generale';
    if (!brands.includes(effectiveBrand)) {
      addBrand(effectiveBrand);
    }

    addOpportunity({
      name,
      company,
      brand: effectiveBrand,
      service,
      leadSource,
      salesRep,
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      value,
      valueType,
      entryDate: italianDateKey(),
      stage,
      notes,
      nextAction: {
        what: actionWhat,
        who: actionWho || salesRep,
        when: actionWhen,
        time: actionTime,
        type: actionType,
        priority: actionPriority,
        completed: false,
      },
    });

    setIsNewDealModalOpen(false);
    // Reset form
    setName('');
    setCompany('');
    setNotes('');
  };

  const servicesList = INITIAL_SERVICES[brand] || [
    'Consulenza Strategica',
    'Sviluppo Tecnico',
    'Campagne Digital ROI',
  ];

  const brandOptions: DropdownOption[] = [
    ...brands.map((b) => ({ value: b, label: b })),
    { value: '__add__', label: 'Aggiungi nuovo brand…', isAction: true },
  ];

  const serviceOptions: DropdownOption[] = servicesList.map((srv) => ({ value: srv, label: srv }));

  const leadSourceOptions: DropdownOption[] = [
    { value: 'Non specificata', label: 'Non specificata' },
    { value: 'Webinar B2B', label: 'Webinar B2B' },
    { value: 'Google Ads', label: 'Google Ads' },
    { value: 'Meta Ads', label: 'Meta Ads' },
    { value: 'Referral', label: 'Referral / Passaparola' },
    { value: 'Inbound', label: 'Inbound Sito Web' },
    { value: 'Outbound', label: 'Outbound LinkedIn' },
  ];

  const repList = [defaultRep, ...salesReps.filter((r) => r.name !== defaultRep).map((r) => r.name)];
  const salesRepOptions: DropdownOption[] = Array.from(new Set(repList)).map((r) => ({ value: r, label: r }));

  const valueTypeOptions: DropdownOption[] = [
    { value: 'One Shot', label: 'One Shot (Una Tantum)' },
    { value: 'Mensile', label: 'Mensile (Ricorrente MRR)' },
    { value: 'Annuale', label: 'Annuale (Accordo Annuale)' },
  ];

  const actionTypeOptions: DropdownOption[] = [
    { value: 'chiamata', label: 'Chiamata', icon: 'call' },
    { value: 'appuntamento', label: 'Video Call', icon: 'videocam' },
    { value: 'follow-up', label: 'Follow-up', icon: 'history' },
    { value: 'preventivo', label: 'Preventivo', icon: 'request_quote' },
    { value: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  ];

  const actionPriorityOptions: DropdownOption[] = [
    { value: 'Alta', label: 'Alta' },
    { value: 'Media', label: 'Media' },
    { value: 'Bassa', label: 'Bassa' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="modal-card bg-[#14151a] max-w-3xl w-full rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="font-headline font-bold text-lg text-white">
              Nuova Opportunità Commerciale
            </h2>
            <p className="text-xs text-zinc-400">
              Inserisci i dati del lead. In base alla regola fondamentale, devi includere subito una prossima azione.
            </p>
          </div>
          <button
            onClick={() => setIsNewDealModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs">
          {/* Section 1: Customer Details */}
          <div className="flex flex-col gap-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#a5b4fc]">
              1. Dati Anagrafici & Contatto
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">
                  Nome e Cognome Referente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es: Dott. Mario Rossi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">
                  Ragione Sociale Azienda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es: TechSpa S.r.l."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Telefono</label>
                <input
                  type="text"
                  placeholder="+39 02 8934521"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  placeholder="+39 340 1234567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="m.rossi@azienda.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Commercial Scope */}
          <div className="flex flex-col gap-3 pt-3 border-t border-white/[0.08]">
            <span className="font-bold text-xs uppercase tracking-wider text-[#a5b4fc]">
              2. Assegnazione & Valore Commerciale
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-zinc-300 block">Brand *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const val = window.prompt('Nome del nuovo brand da aggiungere:');
                      if (val && val.trim()) {
                        addBrand(val.trim());
                        setBrand(val.trim());
                      }
                    }}
                    className="text-[11px] text-[#a5b4fc] hover:underline font-semibold cursor-pointer"
                  >
                    + Nuovo brand
                  </button>
                </div>
                {brands.length === 0 ? (
                  <input
                    type="text"
                    placeholder="Es: Mio Brand o Azienda"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                    className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                  />
                ) : (
                  <CustomDropdown
                    value={brand}
                    onChange={(val) => {
                      if (val === '__add__') {
                        const newName = window.prompt('Nome del nuovo brand:');
                        if (newName && newName.trim()) {
                          addBrand(newName.trim());
                          setBrand(newName.trim());
                        }
                        return;
                      }
                      setBrand(val);
                    }}
                    options={brandOptions}
                    placeholder="Seleziona brand…"
                  />
                )}
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Servizio Interessato *</label>
                <CustomDropdown
                  value={service}
                  onChange={(val) => setService(val)}
                  options={serviceOptions}
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Fonte del Lead</label>
                <CustomDropdown
                  value={leadSource}
                  onChange={(val) => setLeadSource(val)}
                  options={leadSourceOptions}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Responsabile Commerciale *</label>
                <CustomDropdown
                  value={salesRep}
                  onChange={(val) => setSalesRep(val)}
                  options={salesRepOptions}
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Valore Economico (€) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Tipologia Valore</label>
                <CustomDropdown
                  value={valueType}
                  onChange={(val) => setValueType(val as any)}
                  options={valueTypeOptions}
                />
              </div>
            </div>
          </div>

          {/* Section 3: REGOLA FONDAMENTALE (PROSSIMA AZIONE) */}
          <div className="flex flex-col gap-3 p-4 bg-[#a5b4fc]/[0.04] rounded-xl border border-[#a5b4fc]/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#a5b4fc] text-[18px]">verified</span>
              <span className="font-headline font-bold text-xs uppercase tracking-wider text-[#a5b4fc]">
                3. Regola Fondamentale: Prossima Azione Obbligatoria
              </span>
            </div>

            <div>
              <label className="font-semibold text-zinc-300 block mb-1">
                Cosa bisogna fare? *
              </label>
              <input
                type="text"
                required
                value={actionWhat}
                onChange={(e) => setActionWhat(e.target.value)}
                placeholder="Es: Telefonata conoscitiva e invio brochure"
                className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Chi deve farlo?</label>
                <CustomDropdown
                  value={actionWho}
                  onChange={(val) => setActionWho(val)}
                  options={salesRepOptions}
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Tipologia</label>
                <CustomDropdown
                  value={actionType}
                  onChange={(val) => setActionType(val as any)}
                  options={actionTypeOptions}
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Quando (Data) *</label>
                <input
                  type="date"
                  required
                  value={actionWhen}
                  onChange={(e) => setActionWhen(e.target.value)}
                  className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Priorità</label>
                <CustomDropdown
                  value={actionPriority}
                  onChange={(val) => setActionPriority(val as any)}
                  options={actionPriorityOptions}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Note Iniziali</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Esigenze espresse dal cliente, note della trattativa..."
              className="w-full bg-[#121316] p-2.5 rounded-lg border border-white/10 text-white outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsNewDealModalOpen(false)}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white font-medium cursor-pointer transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Crea Trattativa nel CRM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
