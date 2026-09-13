'use client';

import { useState, useEffect, useCallback } from 'react';
import TiaIcon from '@/app/components/TiaIcon';
import {
  SentIcon,
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  SparklesIcon,
} from '@/app/components/icons';
import { Send, Eye, MessageSquare, Copy, Check } from 'lucide-react';

interface DigestData {
  ok: boolean;
  dry?: boolean;
  week?: string;
  headline?: string;
  text?: string;
}

export default function WeeklyDigestPreview() {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cron/weekly-digest?dry=1');
      const json = await res.json();
      if (res.ok && json.ok) {
        setData(json);
      } else {
        setError(json.error || 'Impossibile generare l\'anteprima del digest');
      }
    } catch {
      setError('Errore durante il recupero del report settimanale');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleSendNow = async () => {
    if (!confirm('Vuoi inviare immediatamente questo report sul tuo canale/chat Telegram?')) return;
    setSending(true);
    setError(null);
    setSendSuccess(null);
    try {
      const res = await fetch('/api/cron/weekly-digest?force=1');
      const json = await res.json();
      if (res.ok && json.sent) {
        setSendSuccess('Report settimanale inviato con successo a Telegram!');
        setTimeout(() => setSendSuccess(null), 5000);
      } else if (json.reason) {
        setSendSuccess(`Stato: ${json.reason}`);
      } else {
        setError(json.error || 'Invio a Telegram non riuscito. Controlla TELEGRAM_BOT_TOKEN e CHAT_ID');
      }
    } catch {
      setError('Errore durante la connessione con Telegram');
    } finally {
      setSending(false);
    }
  };

  const copyDigestText = () => {
    if (!data?.text) return;
    navigator.clipboard.writeText(data.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Send size={18} />
            </span>
            <h3 className="text-base font-bold text-white">Anteprima Riepilogo Settimanale (Telegram)</h3>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Il bot genera ogni lunedì questo report con i numeri di funnel, sorgenti e codici passaparola.
            Puoi verificare il testo in anteprima e forzarne l&apos;invio immediato in qualsiasi momento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPreview}
            disabled={loading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Aggiorna anteprima"
          >
            <TiaIcon icon={RefreshIcon} size={14} className={loading ? 'animate-spin' : ''} />
            <span>Aggiorna</span>
          </button>

          <button
            onClick={copyDigestText}
            disabled={!data?.text}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Copia testo per Telegram"
          >
            {copied ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copiato' : 'Copia'}</span>
          </button>

          <button
            onClick={handleSendNow}
            disabled={sending || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-black font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            <Send size={14} className={sending ? 'animate-pulse' : ''} />
            <span>{sending ? 'Invio in corso...' : 'Invia subito a Telegram'}</span>
          </button>
        </div>
      </div>

      {/* ── Alerts / Feedback ── */}
      {sendSuccess && (
        <div className="mb-4 p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
          <TiaIcon icon={CheckmarkCircle01Icon} size={16} strokeWidth={2.5} />
          {sendSuccess}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <TiaIcon icon={AlertCircleIcon} size={16} strokeWidth={2} />
          {error}
        </div>
      )}

      {/* ── Message Preview Screen (Telegram Style) ── */}
      {loading && !data ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-neutral-400">Calcolo metriche e aggregazione riepilogo...</p>
        </div>
      ) : data?.text ? (
        <div className="relative">
          <div className="flex items-center justify-between px-3 py-2 bg-[#0c1e18] border border-white/[0.08] border-b-0 rounded-t-2xl text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5 font-mono text-teal-300">
              <MessageSquare size={13} />
              <span>Messaggio Telegram ({data.week || 'Settimana corrente'})</span>
            </div>
            <span className="text-[10px] text-neutral-500">{data.text.length} caratteri</span>
          </div>

          <pre className="p-4 bg-black/60 border border-white/[0.08] rounded-b-2xl font-mono text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-teal-500/30">
            {data.text}
          </pre>
        </div>
      ) : (
        <div className="py-8 text-center text-neutral-500 text-xs">
          Nessun dato disponibile per il riepilogo settimanale.
        </div>
      )}
    </div>
  );
}
