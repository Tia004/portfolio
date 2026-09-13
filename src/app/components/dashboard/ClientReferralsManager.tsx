'use client';

import { useState, useEffect, useCallback } from 'react';
import TiaIcon from '@/app/components/TiaIcon';
import {
  Discount01Icon,
  Link01Icon,
  RefreshIcon,
  SparklesIcon,
  Mail01Icon,
  DollarSignIcon,
  CheckmarkCircle01Icon,
} from '@/app/components/icons';
import { Copy, Check, Plus, Trash2, ExternalLink } from 'lucide-react';

interface ReferralLead {
  id: string;
  leadName: string;
  leadEmail: string;
  service: string | null;
  source: string;
  dealValue: number | null;
  attributedReward: number | null;
  createdAt: string;
}

interface ClientReferral {
  id: string;
  code: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  discountPercent: number;
  visitsCount: number;
  leadsCount: number;
  conversionsCount: number;
  totalRewardAttributed: number;
  status: string;
  notes: string | null;
  createdAt: string;
  leads: ReferralLead[];
}

export default function ClientReferralsManager() {
  const [referrals, setReferrals] = useState<ClientReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCustomCode, setFormCustomCode] = useState('');
  const [formDiscount, setFormDiscount] = useState(20);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal reward / deal value
  const [dealModalReferral, setDealModalReferral] = useState<ClientReferral | null>(null);
  const [dealAmount, setDealAmount] = useState('');
  const [dealLeadName, setDealLeadName] = useState('');
  const [dealLeadEmail, setDealLeadEmail] = useState('');
  const [savingDeal, setSavingDeal] = useState(false);

  // Auto-generate loading
  const [autoGenerating, setAutoGenerating] = useState(false);

  // Copied states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Expand leads
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/master/referrals');
      const data = await res.json();
      if (res.ok && data.referrals) {
        setReferrals(data.referrals);
      } else {
        setError(data.error || 'Impossibile caricare i codici referral');
      }
    } catch {
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/master/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formName,
          clientEmail: formEmail,
          clientCompany: formCompany || undefined,
          customCode: formCustomCode || undefined,
          discountPercent: Number(formDiscount) || 20,
          notes: formNotes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsCreateOpen(false);
        setFormName('');
        setFormEmail('');
        setFormCompany('');
        setFormCustomCode('');
        setFormNotes('');
        setSuccessMsg(`Codice ?ref=${data.referral.code} creato con successo!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchReferrals();
      } else {
        setError(data.error || 'Errore durante la creazione del referral');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!confirm('Vuoi generare automaticamente un codice referral personale per tutti i clienti esistenti (preventivi e contatti)?')) return;
    setAutoGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/master/referrals/auto-generate', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg(`Generati ${data.createdCount} nuovi codici referral con successo!`);
        setTimeout(() => setSuccessMsg(null), 5000);
        fetchReferrals();
      } else {
        setError(data.error || 'Errore durante l\'auto-generazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il referral ?ref=${code}?`)) return;
    try {
      const res = await fetch(`/api/master/referrals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReferrals(prev => prev.filter(r => r.id !== id));
        setSuccessMsg(`Referral ?ref=${code} rimosso.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setError('Errore durante l\'eliminazione');
    }
  };

  const handleAddDealReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealModalReferral || !dealAmount) return;
    setSavingDeal(true);
    try {
      const val = parseFloat(dealAmount);
      const reward = Math.round(val * (dealModalReferral.discountPercent / 100) * 100) / 100;
      const res = await fetch('/api/master/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dealModalReferral.id,
          manualDealReward: reward,
        }),
      });
      if (res.ok) {
        setDealModalReferral(null);
        setDealAmount('');
        setDealLeadName('');
        setDealLeadEmail('');
        setSuccessMsg(`Attribuita ricompensa di €${reward} (20% su €${val}) a ${dealModalReferral.clientName}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
        fetchReferrals();
      }
    } catch {
      setError('Errore nell\'attribuzione della ricompensa');
    } finally {
      setSavingDeal(false);
    }
  };

  const copyShareLink = (code: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tiadesigns.it';
    const link = `${origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyShareMessage = (ref: ClientReferral) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tiadesigns.it';
    const link = `${origin}/?ref=${ref.code}`;
    const text = `Ciao ${ref.clientName}! Ecco il tuo link personale di Tia Designs:\n\n👉 ${link}\n\nCondividilo con qualsiasi contatto o azienda che ha bisogno di un sito web, e-commerce o grafica: riceveranno subito il ${ref.discountPercent}% di sconto sul loro progetto, e a te verrà riconosciuto il ${ref.discountPercent}% in automatico!`;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(ref.id);
    setTimeout(() => setCopiedMsgId(null), 2500);
  };

  const totalVisits = referrals.reduce((acc, r) => acc + r.visitsCount, 0);
  const totalLeads = referrals.reduce((acc, r) => acc + r.leadsCount, 0);
  const totalRewards = referrals.reduce((acc, r) => acc + r.totalRewardAttributed, 0);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Stats ── */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <TiaIcon icon={Discount01Icon} size={20} strokeWidth={2} />
              </span>
              <h3 className="text-lg font-bold text-white">Programma Referral & Passaparola (20%)</h3>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              Ogni cliente ha un link <code className="text-teal-300 font-mono">?ref=</code> unico.
              Quando qualcuno atterra dal link e invia un preventivo o messaggio, il 20% è tracciato e attribuito
              in automatico nel sistema senza dover chiedere nulla a mano.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-teal-500/20"
            >
              <Plus size={15} strokeWidth={2.5} />
              Nuovo Codice Cliente
            </button>
            <button
              onClick={handleAutoGenerate}
              disabled={autoGenerating}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50"
              title="Genera link per tutti i clienti presenti nei preventivi e contatti"
            >
              <TiaIcon icon={SparklesIcon} size={14} className="text-teal-400" />
              {autoGenerating ? 'Generazione...' : 'Auto-Genera Tutti'}
            </button>
            <button
              onClick={fetchReferrals}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-400 hover:text-white transition-all"
              title="Ricarica"
            >
              <TiaIcon icon={RefreshIcon} size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          <div className="bg-black/30 border border-white/[0.04] rounded-2xl p-3.5">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">Codici Attivi</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{referrals.length}</p>
          </div>
          <div className="bg-black/30 border border-white/[0.04] rounded-2xl p-3.5">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">Visite Portate</p>
            <p className="text-xl font-bold font-mono text-teal-300 mt-1">{totalVisits}</p>
          </div>
          <div className="bg-black/30 border border-white/[0.04] rounded-2xl p-3.5">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">Lead Generati</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{totalLeads}</p>
          </div>
          <div className="bg-black/30 border border-white/[0.04] rounded-2xl p-3.5">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">Ricompense 20%</p>
            <p className="text-xl font-bold font-mono text-teal-400 mt-1">€{totalRewards.toLocaleString('it-IT')}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
          <TiaIcon icon={CheckmarkCircle01Icon} size={16} strokeWidth={2.5} />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* ── Referrals List Table ── */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 sm:p-6 overflow-hidden">
        <h4 className="text-sm font-bold text-white mb-4">Elenco Referral Clienti</h4>

        {loading && referrals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-7 h-7 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-neutral-400">Caricamento programma referral...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-neutral-400 text-sm">Nessun codice referral creato.</p>
            <p className="text-xs text-neutral-500 mt-1">
              Clicca su &quot;Nuovo Codice Cliente&quot; o &quot;Auto-Genera Tutti&quot; per iniziare.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                  <th className="pb-3 pr-4 font-semibold">Cliente / Azienda</th>
                  <th className="pb-3 px-3 font-semibold">Codice Referral</th>
                  <th className="pb-3 px-3 text-right font-semibold">Visite</th>
                  <th className="pb-3 px-3 text-right font-semibold">Lead</th>
                  <th className="pb-3 px-3 text-right font-semibold">Progetti</th>
                  <th className="pb-3 px-3 text-right font-semibold">Sconto 20%</th>
                  <th className="pb-3 pl-4 text-right font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {referrals.map((ref) => {
                  const isCopied = copiedId === ref.id;
                  const isMsgCopied = copiedMsgId === ref.id;
                  const hasLeads = ref.leads && ref.leads.length > 0;
                  const isExpanded = expandedId === ref.id;

                  return (
                    <tr key={ref.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 pr-4 align-top">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{ref.clientName}</span>
                          {ref.clientCompany && (
                            <span className="text-[10px] text-teal-400/80 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                              {ref.clientCompany}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{ref.clientEmail}</div>
                        {ref.notes && (
                          <div className="text-[10px] text-neutral-500 mt-0.5 italic">{ref.notes}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top font-mono">
                        <div className="inline-flex items-center gap-1.5 bg-black/40 border border-teal-500/30 px-2 py-1 rounded-lg text-teal-300 font-semibold">
                          <TiaIcon icon={Link01Icon} size={11} strokeWidth={2} />
                          ?ref={ref.code}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">
                          Sconto promesso: <strong className="text-teal-400">{ref.discountPercent}%</strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-neutral-300 align-top">
                        {ref.visitsCount}
                      </td>

                      <td className="py-3.5 px-3 text-right align-top">
                        <span
                          onClick={() => hasLeads && setExpandedId(isExpanded ? null : ref.id)}
                          className={`font-mono font-bold inline-flex items-center gap-1 ${
                            ref.leadsCount > 0 ? 'text-emerald-400 cursor-pointer underline decoration-dotted' : 'text-neutral-500'
                          }`}
                          title={hasLeads ? 'Clicca per vedere i contatti portati' : ''}
                        >
                          {ref.leadsCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-neutral-300 align-top">
                        {ref.conversionsCount}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold align-top" style={{ color: ref.totalRewardAttributed > 0 ? '#2dd4bf' : '#737373' }}>
                        €{ref.totalRewardAttributed.toLocaleString('it-IT')}
                      </td>

                      <td className="py-3.5 pl-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy URL */}
                          <button
                            onClick={() => copyShareLink(ref.code, ref.id)}
                            className={`p-1.5 rounded-lg border text-xs transition-all ${
                              isCopied
                                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                                : 'bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-white/[0.08]'
                            }`}
                            title="Copia link referral"
                          >
                            {isCopied ? <Check size={13} className="text-teal-400" /> : <Copy size={13} />}
                          </button>

                          {/* Copy WhatsApp text */}
                          <button
                            onClick={() => copyShareMessage(ref)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1 ${
                              isMsgCopied
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-white/[0.08]'
                            }`}
                            title="Copia messaggio pronto da inviare al cliente via WhatsApp o Email"
                          >
                            <TiaIcon icon={Mail01Icon} size={12} />
                            <span>{isMsgCopied ? 'Copiato!' : 'Messaggio'}</span>
                          </button>

                          {/* Add Deal / Reward */}
                          <button
                            onClick={() => setDealModalReferral(ref)}
                            className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs transition-all"
                            title="Attribuisci valore preventivo convertito"
                          >
                            <TiaIcon icon={DollarSignIcon} size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(ref.id, ref.code)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs transition-all"
                            title="Elimina referral"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Expanded leads list */}
                        {isExpanded && hasLeads && (
                          <div className="mt-3 p-3 bg-black/50 border border-teal-500/20 rounded-xl text-left space-y-2">
                            <p className="text-[10px] uppercase font-bold text-teal-400">
                              Contatti arrivati tramite questo referral:
                            </p>
                            <div className="space-y-1.5">
                              {ref.leads.map((lead) => (
                                <div key={lead.id} className="text-[11px] flex justify-between items-center border-b border-white/[0.04] pb-1">
                                  <div>
                                    <span className="font-semibold text-white">{lead.leadName}</span>
                                    <span className="text-neutral-400 ml-1.5 font-mono">({lead.leadEmail})</span>
                                    {lead.service && <span className="text-teal-300 ml-1">· {lead.service}</span>}
                                  </div>
                                  <span className="text-[10px] text-neutral-500">
                                    {new Date(lead.createdAt).toLocaleDateString('it-IT')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Create Referral ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#081410] border border-white/[0.12] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TiaIcon icon={Discount01Icon} size={18} className="text-teal-400" />
                Crea Codice Referral Cliente
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                Chiudi
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Nome Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Mario Rossi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Email Cliente *</label>
                <input
                  type="email"
                  required
                  placeholder="es. mario.rossi@email.it"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Azienda (opzionale)</label>
                <input
                  type="text"
                  placeholder="es. Auto Soccorso Modena"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Codice Personalizzato (opzionale)</label>
                <div className="flex items-center bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 focus-within:border-teal-400">
                  <span className="text-neutral-500 font-mono">?ref=</span>
                  <input
                    type="text"
                    placeholder="lascia vuoto per auto-generarlo"
                    value={formCustomCode}
                    onChange={(e) => setFormCustomCode(e.target.value)}
                    className="w-full bg-transparent text-white font-mono placeholder-neutral-500 focus:outline-none ml-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Percentuale Sconto (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Note Interne</label>
                  <input
                    type="text"
                    placeholder="es. Cliente storico"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-400 text-black font-semibold hover:bg-teal-300 disabled:opacity-50"
                >
                  {submitting ? 'Creazione...' : 'Crea Codice Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Add Deal Reward ── */}
      {dealModalReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#081410] border border-white/[0.12] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TiaIcon icon={DollarSignIcon} size={18} className="text-teal-400" />
              Attribuisci 20% Progetto
            </h3>
            <p className="text-xs text-neutral-400">
              Inserisci l&apos;importo totale del preventivo chiuso per il cliente portato da{' '}
              <strong className="text-white">{dealModalReferral.clientName}</strong>. Il sistema calcolerà
              il {dealModalReferral.discountPercent}% in automatico.
            </p>

            <form onSubmit={handleAddDealReward} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Valore Progetto Chiuso (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="es. 1500"
                  value={dealAmount}
                  onChange={(e) => setDealAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-teal-400"
                />
                {dealAmount && (
                  <p className="text-[11px] text-teal-400 mt-1 font-semibold">
                    Ricompensa calcolata ({dealModalReferral.discountPercent}%): €
                    {(parseFloat(dealAmount) * (dealModalReferral.discountPercent / 100)).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDealModalReferral(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingDeal}
                  className="px-4 py-2 rounded-xl bg-teal-400 text-black font-semibold hover:bg-teal-300 disabled:opacity-50"
                >
                  {savingDeal ? 'Salvataggio...' : 'Attribuisci 20%'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
