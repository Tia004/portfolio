'use client';

import { useEffect, useRef, useState } from 'react';

type Session = { sessionId: string; channel: 'ai' | 'telegram'; lastMessage: string; sender: string; timestamp: number; count: number };
type Message = { id: string; text: string; sender: string; timestamp: number };
type Lead = { id: string; sessionId: string; category: string; service: string | null; budget: string | null; userGoal: string | null; clientName: string | null; createdAt: string };

export default function ChatArchive() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<'all' | 'ai' | 'telegram'>('all');
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    fetch('/api/master/chats', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Impossibile caricare l’archivio');
      return response.json();
    }).then((data) => {
      const loadedSessions = (data.sessions || []) as Session[];
      const loadedLeads = (data.leads || []) as Lead[];
      const known = new Set(loadedSessions.filter((s) => s.channel === 'ai').map((s) => s.sessionId));
      const leadOnly: Session[] = loadedLeads.filter((lead) => !known.has(lead.sessionId)).map((lead) => ({
        sessionId: lead.sessionId, channel: 'ai', sender: 'bot',
        lastMessage: lead.userGoal || lead.service || 'Preventivo AI salvato',
        timestamp: new Date(lead.createdAt).getTime(), count: 0,
      }));
      setSessions([...loadedSessions, ...leadOnly].sort((a, b) => b.timestamp - a.timestamp));
      setLeads(loadedLeads);
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function openSession(session: Session) {
    const currentRequest = ++requestId.current;
    setSelected(session);
    setMessages([]);
    setError('');
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/master/chats?sessionId=${encodeURIComponent(session.sessionId)}&channel=${session.channel}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Impossibile aprire la conversazione');
      const data = await response.json();
      if (currentRequest === requestId.current) setMessages(data.messages || []);
    } catch (err) {
      if (currentRequest === requestId.current) setError(err instanceof Error ? err.message : 'Errore di caricamento');
    } finally {
      if (currentRequest === requestId.current) setDetailsLoading(false);
    }
  }

  const visible = sessions.filter((session) => filter === 'all' || session.channel === filter);
  const leadBySession = new Map(leads.map((lead) => [lead.sessionId, lead]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)] gap-5 min-h-[560px]">
      <div className="bg-[#081410]/85 border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-4 min-h-0">
        <div>
          <h2 className="font-bold text-white text-lg">Archivio conversazioni</h2>
          <p className="text-xs text-neutral-400 mt-1">Chatbot AI e chat Telegram, con i relativi preventivi.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra conversazioni">
          {([['all', 'Tutte'], ['ai', 'Chatbot AI'], ['telegram', 'Telegram']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${filter === value ? 'bg-teal-400 text-black' : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.12]'}`}>
              {label}
            </button>
          ))}
        </div>
        {loading ? <p className="text-sm text-neutral-400">Caricamento conversazioni…</p> : null}
        {!loading && visible.length === 0 ? <p className="text-sm text-neutral-400">Nessuna conversazione in questa sezione.</p> : null}
        <div className="flex flex-col gap-2 max-h-[610px] overflow-y-auto pr-1">
          {visible.map((session) => {
            const lead = leadBySession.get(session.sessionId);
            return (
              <button key={`${session.channel}:${session.sessionId}`} type="button" onClick={() => void openSession(session)}
                className={`text-left p-4 rounded-2xl border cursor-pointer transition-colors ${selected?.sessionId === session.sessionId && selected.channel === session.channel ? 'border-teal-400/50 bg-teal-400/10' : 'border-white/[0.06] bg-black/25 hover:bg-white/[0.06]'}`}>
                <div className="flex items-center justify-between gap-2 text-[11px] mb-2">
                  <span className="font-bold text-teal-300">{session.channel === 'ai' ? '✦ Chatbot AI' : '◉ Telegram'}{lead?.clientName ? ` · ${lead.clientName}` : ''}</span>
                  <span className="text-neutral-500 shrink-0">{new Date(session.timestamp).toLocaleDateString('it-IT')}</span>
                </div>
                <p className="text-sm text-white/85 line-clamp-2 break-words">{session.lastMessage.replace(/\[[A-Z_]+:[^\]]*\]/g, '').slice(0, 180)}</p>
                <span className="text-[10px] text-neutral-500 mt-2 inline-block">{session.count} messaggi{lead?.service ? ` · ${lead.service}` : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#081410]/85 border border-white/[0.08] rounded-3xl overflow-hidden flex flex-col min-h-[560px] max-h-[760px]">
        <div className="px-5 py-4 border-b border-white/[0.08] bg-black/20">
          <h3 className="text-sm font-bold text-white">{selected ? selected.channel === 'ai' ? '✦ Conversazione chatbot' : '◉ Conversazione Telegram' : 'Anteprima chat'}</h3>
          <p className="text-[11px] text-neutral-500 mt-1">{selected ? `${new Date(selected.timestamp).toLocaleString('it-IT')} · ${selected.count} messaggi` : 'Seleziona una conversazione per leggerla.'}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.08),transparent_55%)]">
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {messages.map((message) => {
            const fromVisitor = message.sender === 'client';
            return (
              <div key={message.id} className={`max-w-[85%] ${fromVisitor ? 'self-end' : 'self-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${fromVisitor ? 'bg-teal-400 text-[#06120f] rounded-br-sm' : 'bg-white/[0.08] text-white rounded-bl-sm border border-white/[0.06]'}`}>
                  {message.text.replace(/\[PREVENTIVO:[\s\S]*?\]/g, '[Preventivo generato]')}
                </div>
                <p className={`text-[10px] text-neutral-500 mt-1 ${fromVisitor ? 'text-right' : ''}`}>
                  {fromVisitor ? 'Visitatore' : selected?.channel === 'ai' ? 'AI di Tia Designs' : 'Tia'} · {new Date(message.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}
          {selected && detailsLoading ? <p className="text-sm text-neutral-500">Caricamento messaggi…</p> : null}
          {selected && !detailsLoading && messages.length === 0 && !error ? <p className="text-sm text-neutral-500">I messaggi di questa conversazione non erano ancora archiviati. Il riepilogo del preventivo resta disponibile qui sotto.</p> : null}
        </div>
        {selected && leadBySession.get(selected.sessionId) && (
          <div className="px-5 py-3 border-t border-white/[0.08] bg-black/20 text-xs text-neutral-300">
            <span className="font-bold text-teal-300">Preventivo:</span> {leadBySession.get(selected.sessionId)?.service || leadBySession.get(selected.sessionId)?.category}
            {leadBySession.get(selected.sessionId)?.budget ? ` · ${leadBySession.get(selected.sessionId)?.budget}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
