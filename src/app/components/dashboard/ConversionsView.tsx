'use client';

import { useCallback, useEffect, useState } from 'react';
import TiaIcon from '@/app/components/TiaIcon';
import {
  AnalyticsUpIcon,
  BubbleChatIcon,
  Calendar01Icon,
  Discount01Icon,
  FilePenIcon,
  Link01Icon,
  RefreshIcon,
} from '@/app/components/icons';
import {
  CONVERSION_NAMES,
  conversionRate,
  deltaPct,
  type ConversionCounts,
  type ConversionName,
} from '@/lib/conversion-metrics';
import { SOURCE_LABELS, STEP_META } from '@/lib/conversion-labels';
import WeeklyDigestPreview from './WeeklyDigestPreview';
import ClientReferralsManager from './ClientReferralsManager';

// ── Conversions ───────────────────────────────────────────────────────────
// The panel the site was missing: the three funnel steps it has been logging
// (quote sent, call booked, first chat message) read back as numbers — over
// time, per source, and per `?ref=` code.
//
// Why this exists: clicks and scroll depth say where people LOOK. These three
// say where they ACT, and they are the only ones that can tell whether a
// headline, a CTA or the 20% word-of-mouth offer actually produced a
// conversation. Without them every decision is made on a feeling.

interface DailyPoint extends ConversionCounts {
  date: string;
}

interface SourceBreakdown extends ConversionCounts {
  source: string;
}

interface ReferralStat {
  code: string;
  sessions: number;
  pageviews: number;
  conversions: ConversionCounts;
  lastSeen: number;
}

interface RecentConversion {
  name: ConversionName;
  source: string;
  url: string;
  ref: string | null;
  detail: Record<string, string>;
  timestamp: number;
}

interface Report {
  days: number;
  range: { from: string; to: string };
  sessions: number;
  totals: ConversionCounts;
  previous: ConversionCounts;
  daily: DailyPoint[];
  sources: SourceBreakdown[];
  referrals: ReferralStat[];
  recent: RecentConversion[];
  names: ConversionName[];
}

const PERIODS = [
  { days: 1, label: '24h' },
  { days: 7, label: '7g' },
  { days: 30, label: '30g' },
  { days: 90, label: '90g' },
];

const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

function Sparkbar({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points, 1);
  return (
    <div className="flex items-end gap-[2px] h-6" aria-hidden>
      {points.map((value, i) => (
        <span
          key={i}
          className="w-full rounded-sm transition-all duration-500"
          style={{ height: `${Math.max(6, (value / max) * 100)}%`, backgroundColor: color, opacity: value > 0 ? 0.9 : 0.18 }}
        />
      ))}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-500">nessun dato precedente</span>;
  const up = value >= 0;
  return (
    <span className={up ? 'text-teal-400' : 'text-rose-400'}>
      {up ? '↑' : '↓'} {Math.abs(value)}% vs periodo precedente
    </span>
  );
}

/** Report fetch, outside the component so the effect holds no state logic. */
async function fetchReport(days: number, signal: AbortSignal): Promise<Report> {
  const res = await fetch(`/api/analytics/conversions?days=${days}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Report;
}

const REFRESH_MS = 30_000;

export default function ConversionsView() {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // One fetch path for everything (period change, manual refresh, auto-refresh):
  // bumping this key re-runs the single effect below. State is never set in the
  // effect body itself — only in the promise callbacks — so a slow response can
  // never cascade renders, and an aborted one (period changed, panel closed) is
  // dropped instead of overwriting fresher data.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(days, controller.signal)
      .then((data) => {
        setReport(data);
        setError(false);
        setUpdatedAt(new Date());
      })
      .catch((err: unknown) => {
        // An aborted request is not a failure: it was superseded.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, refreshKey]);

  // Auto-refresh: the panel is usually left open on a second monitor.
  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((k) => k + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  if (loading && !report) {
    return (
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-white">Carico il funnel…</p>
        <p className="text-xs text-neutral-400 mt-1">Preventivi, call e chat per periodo</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-12 text-center">
        <p className="text-sm font-bold text-white">Report non disponibile</p>
        <p className="text-xs text-neutral-400 mt-1 mb-4">
          La lettura degli eventi di conversione è fallita. Riprova: se persiste, il database è irraggiungibile.
        </p>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
        >
          <TiaIcon icon={RefreshIcon} size={14} strokeWidth={2} />
          Riprova
        </button>
      </div>
    );
  }

  if (!report) return null;

  const rate = conversionRate(report.totals.total, report.sessions);
  const previousRate = conversionRate(report.previous.total, report.sessions);
  const dayMax = Math.max(...report.daily.map((d) => d.total), 1);
  const hasData = report.totals.total > 0;

  return (
    <div className="space-y-6">
      {/* ── Header + period selector ── */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <TiaIcon icon={AnalyticsUpIcon} size={19} className="text-teal-400" strokeWidth={2} />
              Conversioni
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
              Le tre azioni che contano: preventivo inviato, call prenotata, primo messaggio in chat. Con la sorgente
              di ognuna e i codici passaparola, così sai cosa ha portato un contatto e non solo quante visite.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-full bg-white/[0.05] border border-white/10 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => {
                    if (p.days === days) return;
                    setLoading(true);
                    setDays(p.days);
                  }}
                  aria-pressed={days === p.days}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                    days === p.days ? 'bg-teal-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-teal-300 transition-colors"
            >
              <TiaIcon icon={RefreshIcon} size={11} strokeWidth={2} />
              {updatedAt ? `aggiornato ${updatedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : 'aggiorna'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Weekly Digest Preview & Instant Telegram Send ── */}
      <WeeklyDigestPreview />

      {!hasData ? (
        <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-10 text-center">
          <p className="text-sm font-bold text-white">Nessuna conversione nel periodo</p>
          <p className="text-xs text-neutral-400 mt-2 max-w-lg mx-auto leading-relaxed">
            Nel periodo selezionato ({report.days === 1 ? '24 ore' : `${report.days} giorni`}) nessun visitatore ha
            inviato un preventivo, prenotato una call o scritto in chat. Su {report.sessions} sessioni registrate.
            <br />
            Il pannello si popola da solo: gli eventi vengono salvati appena arrivano, senza configurazione.
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI: one card per funnel step + the rate ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {CONVERSION_NAMES.map((name) => {
              const meta = STEP_META[name];
              const value = report.totals[name];
              const spark = report.daily.map((d) => d[name]);
              return (
                <div
                  key={name}
                  className="bg-black/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="shrink-0" style={{ color: meta.color }}>
                      <TiaIcon
                        icon={name === 'preventivo_inviato' ? FilePenIcon : name === 'call_prenotata' ? Calendar01Icon : BubbleChatIcon}
                        size={14}
                        strokeWidth={2}
                      />
                    </span>
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">{meta.label}</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: meta.color }}>
                    {value}
                  </p>
                  <div className="mt-1 text-[11px] text-neutral-400">
                    <Delta value={deltaPct(value, report.previous[name])} />
                  </div>
                  <div className="mt-3">
                    <Sparkbar points={spark} color={meta.color} />
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-500">{meta.hint}</p>
                </div>
              );
            })}

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 hover:border-white/[0.12] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="shrink-0 text-teal-400">
                  <TiaIcon icon={AnalyticsUpIcon} size={14} strokeWidth={2} />
                </span>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">Tasso di conversione</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{rate}%</p>
              <div className="mt-1 text-[11px] text-neutral-400">
                {report.previous.total > 0 ? (
                  <span className={rate >= previousRate ? 'text-teal-400' : 'text-rose-400'}>
                    {rate >= previousRate ? '↑' : '↓'} periodo precedente: {previousRate}%
                  </span>
                ) : (
                  <span className="text-neutral-500">nessun dato precedente</span>
                )}
              </div>
              <p className="mt-4 text-[10px] text-neutral-500">
                {report.totals.total} conversioni su {report.sessions.toLocaleString('it-IT')} sessioni
              </p>
            </div>
          </div>

          {/* ── Daily chart, stacked by funnel step ── */}
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h4 className="text-sm font-bold text-white">Andamento giornaliero</h4>
              <div className="flex flex-wrap items-center gap-3">
                {CONVERSION_NAMES.map((name) => (
                  <span key={name} className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STEP_META[name].color }} />
                    {STEP_META[name].short}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-1.5 sm:gap-2 h-32">
              {report.daily.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col justify-end gap-[2px] group"
                  title={`${day.date}: ${day.total} conversioni`}
                >
                  {CONVERSION_NAMES.map((name) =>
                    day[name] > 0 ? (
                      <div
                        key={name}
                        className="w-full rounded-sm transition-all duration-500"
                        style={{
                          height: `${Math.max(4, (day[name] / dayMax) * 100)}%`,
                          backgroundColor: STEP_META[name].color,
                          opacity: 0.85,
                        }}
                        title={`${STEP_META[name].label}: ${day[name]}`}
                      />
                    ) : null
                  )}
                  {day.total === 0 && <div className="w-full rounded-sm bg-white/[0.05]" style={{ height: '4px' }} />}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>{report.daily[0]?.date.slice(5)}</span>
              {report.daily.length > 2 && <span>{report.daily[Math.floor(report.daily.length / 2)]?.date.slice(5)}</span>}
              <span>{report.daily[report.daily.length - 1]?.date.slice(5)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ── By source ── */}
            <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 sm:p-6">
              <h4 className="text-sm font-bold text-white mb-1">Da dove arrivano</h4>
              <p className="text-[11px] text-neutral-400 mb-4">
                Quale punto di ingresso produce i contatti: se una sorgente non converte, è lì che va cambiato il testo.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
                      <th className="text-left font-medium pb-2">Sorgente</th>
                      {CONVERSION_NAMES.map((name) => (
                        <th key={name} className="text-right font-medium pb-2 px-1">
                          {STEP_META[name].short}
                        </th>
                      ))}
                      <th className="text-right font-medium pb-2">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sources.map((row) => (
                      <tr key={row.source} className="border-t border-white/[0.06]">
                        <td className="py-2.5 pr-2 text-neutral-300">{sourceLabel(row.source)}</td>
                        {CONVERSION_NAMES.map((name) => (
                          <td
                            key={name}
                            className="py-2.5 px-1 text-right font-mono"
                            style={{ color: row[name] > 0 ? STEP_META[name].color : '#525252' }}
                          >
                            {row[name]}
                          </td>
                        ))}
                        <td className="py-2.5 text-right font-mono font-bold text-white">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Referral codes ── */}
            <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 sm:p-6">
              <div className="flex items-start gap-2 mb-1">
                <TiaIcon icon={Discount01Icon} size={15} className="text-teal-400 mt-0.5" strokeWidth={2} />
                <h4 className="text-sm font-bold text-white">Programma passaparola (20%)</h4>
              </div>
              <p className="text-[11px] text-neutral-400 mb-4">
                Ogni codice <span className="font-mono text-teal-300">?ref=</span> qui sotto identifica chi ha
                inoltrato il link: le conversioni sono i contatti arrivati da quel codice, a cui devi il 20% sul
                prossimo progetto.
              </p>
              {report.referrals.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Nessun link passaparola ha portato traffico nel periodo.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
                        <th className="text-left font-medium pb-2">Codice</th>
                        <th className="text-right font-medium pb-2 px-1">Visite</th>
                        <th className="text-right font-medium pb-2 px-1">Sessioni</th>
                        <th className="text-right font-medium pb-2 px-1">Contatti</th>
                        <th className="text-right font-medium pb-2">Visto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.referrals.map((ref) => (
                        <tr key={ref.code} className="border-t border-white/[0.06]">
                          <td className="py-2.5 pr-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-teal-300">
                              <TiaIcon icon={Link01Icon} size={11} strokeWidth={2} />
                              {ref.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono text-neutral-300">{ref.pageviews}</td>
                          <td className="py-2.5 px-1 text-right font-mono text-neutral-300">{ref.sessions}</td>
                          <td className="py-2.5 px-1 text-right font-mono font-bold" style={{ color: ref.conversions.total > 0 ? '#2dd4bf' : '#525252' }}>
                            {ref.conversions.total}
                          </td>
                          <td className="py-2.5 text-right text-[10px] text-neutral-500">
                            {ref.lastSeen ? new Date(ref.lastSeen).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Recent conversions ── */}
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 sm:p-6">
            <h4 className="text-sm font-bold text-white mb-4">Ultime conversioni</h4>
            <div className="space-y-2">
              {report.recent.map((row, i) => {
                const meta = STEP_META[row.name];
                const details = Object.entries(row.detail)
                  .filter(([key]) => key !== 'ref')
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(' · ');
                return (
                  <div
                    key={`${row.timestamp}-${i}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs font-semibold text-white">{meta.label}</span>
                    <span className="text-[11px] text-neutral-400">{sourceLabel(row.source)}</span>
                    <span className="font-mono text-[10px] text-neutral-500">{row.url}</span>
                    {row.ref && (
                      <span className="font-mono text-[10px] text-teal-300 inline-flex items-center gap-1">
                        <TiaIcon icon={Link01Icon} size={10} strokeWidth={2} />
                        {row.ref}
                      </span>
                    )}
                    {details && <span className="text-[10px] text-neutral-500">{details}</span>}
                    <span className="ml-auto font-mono text-[10px] text-neutral-500">
                      {new Date(row.timestamp).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Client Referral Codes & 20% Attribution Manager ── */}
      <ClientReferralsManager />
    </div>
  );
}
