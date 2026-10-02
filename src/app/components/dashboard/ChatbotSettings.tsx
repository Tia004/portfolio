'use client';

import { useEffect, useState } from 'react';

type Config = { customRules: string; nvidiaModel: string; geminiModel: string; nvidiaConfigured: boolean; geminiConfigured: boolean; groqConfigured: boolean; keyStorageReady: boolean };

export default function ChatbotSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [testResult, setTestResult] = useState('');

  async function reload() {
    const response = await fetch('/api/master/chatbot', { cache: 'no-store' });
    if (!response.ok) throw new Error('Configurazione chatbot non disponibile');
    setConfig(await response.json());
  }
  useEffect(() => {
    fetch('/api/master/chatbot', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Configurazione chatbot non disponibile');
        return response.json() as Promise<Config>;
      })
      .then(setConfig)
      .catch((err) => setNotice(err.message));
  }, []);

  async function save(extra: Record<string, unknown> = {}) {
    if (!config) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/master/chatbot', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customRules: config.customRules, nvidiaModel: config.nvidiaModel, geminiModel: config.geminiModel,
          ...(nvidiaKey ? { nvidiaKey } : {}), ...(geminiKey ? { geminiKey } : {}), ...extra }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Salvataggio non riuscito');
      setNvidiaKey(''); setGeminiKey('');
      await reload();
      setNotice('Configurazione salvata. Le chiavi non vengono mai restituite al browser.');
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Errore'); }
    finally { setSaving(false); }
  }

  async function testProviders() {
    setTestResult('Verifica in corso…');
    try {
      const response = await fetch('/api/health?deep=1', { cache: 'no-store' });
      const data = await response.json();
      const ai = data.services?.ai;
      setTestResult(ai ? `Disponibili: ${ai.liveProviders.join(', ') || 'nessuno'}. Configurati: ${ai.providers.join(', ') || 'nessuno'}.` : 'Verifica non disponibile.');
    } catch { setTestResult('Verifica non riuscita.'); }
  }

  if (!config) return <div className="rounded-3xl border border-white/10 bg-[#081410] p-6 text-neutral-300">{notice || 'Caricamento chatbot…'}</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-[#081410]/90 p-6">
        <h2 className="text-xl font-bold text-white">Chatbot e rulebook</h2>
        <p className="text-sm text-neutral-400 mt-2">Gestisci le istruzioni aggiuntive e i modelli del chatbot pubblico.</p>
        <div className="flex flex-wrap gap-2 mt-5">
          <a href="/#chatbot" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-teal-400 text-black text-xs font-bold">Apri il chatbot sul sito ↗</a>
          <button type="button" onClick={() => setShowPreview((current) => !current)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer">{showPreview ? 'Chiudi anteprima' : 'Anteprima qui'}</button>
        </div>
        {showPreview && <iframe title="Anteprima chatbot pubblico" src="/#chatbot" loading="lazy" className="w-full h-[620px] mt-5 rounded-2xl border border-white/10 bg-black" />}
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#081410]/90 p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Rulebook</h3>
        <div className="text-xs text-neutral-300 leading-relaxed space-y-2 bg-black/30 rounded-2xl p-4">
          <p>Il chatbot si presenta come AI di Tia Designs, guida il cliente tra servizio, obiettivo, stile, consegna, budget e contatti, poi genera il riepilogo del preventivo.</p>
          <p>Risponde in italiano, inglese o spagnolo; usa le schede di conoscenza del sito, controlla i dati del preventivo e filtra richieste inappropriate.</p>
          <p>Le regole di sicurezza e il flusso del preventivo restano nel codice del server. Le istruzioni qui sotto si aggiungono al rulebook senza sostituirli.</p>
        </div>
        <label className="block text-xs font-semibold text-teal-300" htmlFor="chatbot-rules">Istruzioni aggiuntive</label>
        <textarea id="chatbot-rules" maxLength={4000} rows={7} value={config.customRules}
          onChange={(event) => setConfig({ ...config, customRules: event.target.value })}
          placeholder="Esempio: quando il cliente chiede un sito vetrina, specifica sempre che il dominio è a parte."
          className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 text-sm text-white resize-y focus:outline-none focus:border-teal-400" />
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#081410]/90 p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-white">Modelli AI e chiavi</h3>
          <p className="text-xs text-neutral-400 mt-2">Le richieste partono dal server. Le chiavi sono cifrate nel database e i campi restano vuoti dopo il salvataggio.</p>
          {!config.keyStorageReady && <p className="text-xs text-amber-300 mt-2">Configura AI_KEYS_ENCRYPTION_KEY sul server con almeno 32 caratteri prima di salvare le chiavi.</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-bold text-white">NVIDIA NIM <span className="text-xs text-teal-300">{config.nvidiaConfigured ? 'Configurata' : 'Da configurare'}</span></p>
            <label className="block text-xs text-neutral-300">Model ID<input value={config.nvidiaModel} onChange={(event) => setConfig({ ...config, nvidiaModel: event.target.value })} className="block mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white" /></label>
            <label className="block text-xs text-neutral-300">API key<input type="password" autoComplete="new-password" value={nvidiaKey} onChange={(event) => setNvidiaKey(event.target.value)} placeholder="Incolla per aggiungere o sostituire" className="block mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white" /></label>
            {config.nvidiaConfigured && <button type="button" onClick={() => void save({ removeNvidia: true })} className="text-xs text-rose-300 underline cursor-pointer">Rimuovi chiave salvata</button>}
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-bold text-white">Gemini AI Studio <span className="text-xs text-teal-300">{config.geminiConfigured ? 'Configurata' : 'Da configurare'}</span></p>
            <label className="block text-xs text-neutral-300">Model ID<input value={config.geminiModel} onChange={(event) => setConfig({ ...config, geminiModel: event.target.value })} className="block mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white" /></label>
            <label className="block text-xs text-neutral-300">API key<input type="password" autoComplete="new-password" value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} placeholder="Incolla per aggiungere o sostituire" className="block mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white" /></label>
            {config.geminiConfigured && <button type="button" onClick={() => void save({ removeGemini: true })} className="text-xs text-rose-300 underline cursor-pointer">Rimuovi chiave salvata</button>}
          </div>
        </div>
        <p className="text-xs text-neutral-500">Groq: {config.groqConfigured ? 'attivo tramite variabile server' : 'non configurato'}. Ordine di riserva: Groq → NVIDIA NIM → Gemini.</p>
        <button type="button" onClick={() => void save()} disabled={saving || !config.keyStorageReady} className="px-5 py-2.5 rounded-xl bg-teal-400 text-black text-sm font-bold cursor-pointer disabled:opacity-50">{saving ? 'Salvataggio…' : 'Salva rulebook e modelli'}</button>
        <button type="button" onClick={() => void testProviders()} className="ml-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold cursor-pointer">Verifica modelli</button>
        {testResult && <p role="status" className="text-xs text-neutral-300">{testResult}</p>}
        {notice && <p role="status" className="text-xs text-teal-300">{notice}</p>}
      </div>
    </div>
  );
}
