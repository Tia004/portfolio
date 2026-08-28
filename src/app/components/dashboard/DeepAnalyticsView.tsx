'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { formatClickElement } from '@/lib/click-elements-dictionary';

const RealWorldMap = dynamic(() => import('@/app/components/RealWorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-3xl bg-[#050f0c] border border-white/10 flex items-center justify-center text-xs text-neutral-400 font-mono">
      <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping mr-2" />
      Caricamento mappa geografica interattiva...
    </div>
  ),
});

// ── Types ──────────────────────────────────────────────────────

interface AnalyticsStats {
  totalEvents: number;
  totalSessions: number;
  pageViews: number;
  totalClicks: number;
  trafficTodayYesterday?: {
    today: { events: number; sessions: number; pageViews: number; clicks: number };
    yesterday: { events: number; sessions: number; pageViews: number; clicks: number };
  };
  topClicked: { element: string; count: number }[];
  recentEvents: { type: string; url: string; data: string | null; timestamp: string; sessionId: string }[];
  scrollDepth: { depth: string; count: number }[];
  eventsByType: { type: string; count: number }[];
  cookieConsentBreakdown: { level: string; count: number }[];
  countries: { code: string; count: number }[];
  dailyVisits: { date: string; count: number }[];
  dailySessions: { date: string; count: number }[];
  dailyConsent: { date: string; all: number; technical: number; none: number }[];
  topCities: { city: string; count: number }[];
  todayConsentRate: { today: number; yesterday: number; todayCount: number; yesterdayCount: number; trend: 'up' | 'down' | 'flat' };
  consentSessionRate: { consentSessions: number };
  uniqueCities: number;
  citiesByCountry: { country: string; cities: { city: string; count: number }[] }[];
}

const DONUT_COLORS = ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#99f6e4', '#ccfbf1', '#f0fdfa'];

function DonutChart({
  segments,
  size = 150,
  thickness = 26,
}: {
  segments: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const center = size / 2;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const cumulative = segments.slice(0, i).reduce((sum, item) => sum + item.value, 0);
          const pct = seg.value / total;
          const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
          const endAngle = ((cumulative + seg.value) / total) * Math.PI * 2 - Math.PI / 2;

          if (pct < 0.001) return null;

          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);
          const largeArc = pct > 0.5 ? 1 : 0;

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color || DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          );
        })}
        <text x={center} y={center - 5} textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700" fontFamily="Outfit, sans-serif">
          {total.toLocaleString()}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="Outfit, sans-serif">
          totale
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: seg.color || DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              <span className="text-neutral-400">{seg.label}</span>
              <span className="text-white font-medium">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color = '#2dd4bf' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-neutral-300 truncate max-w-[70%]">{label}</span>
        <span className="text-neutral-400 font-mono text-[11px]">{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, children, secondary }: { label: string; value: React.ReactNode; color: string; children: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="shrink-0" style={{ color }}>{children}</span>
        <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">{label}</p>
      </div>
      <p className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color }}>{value}</p>
      {secondary && <div className="mt-1 text-[11px] text-neutral-400">{secondary}</div>}
    </div>
  );
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function formatDay(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]} ${d}`;
}

function MultiLineChart({
  series,
  dates,
  height = 200,
}: {
  series: { name: string; color: string; data: number[]; dashed?: boolean; secondary?: boolean }[];
  dates: string[];
  height?: number;
}) {
  const primary = series.filter(s => !s.secondary);

  const pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const w = 600;
  const h = height;
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const primaryValues = primary.flatMap(s => s.data);
  const max = Math.max(...primaryValues, 1);
  const yTicks = 4;
  const yStep = Math.ceil(max / yTicks) || 1;

  const n = dates.length || 7;
  const yPrimary = (val: number) => pad.top + plotH - (val / (max || 1)) * plotH;
  const xPositions = dates.map((_, i) => pad.left + (i / Math.max(n - 1, 1)) * plotW);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = i * yStep;
        const y = pad.top + plotH - (val / (max || 1)) * plotH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#ffffff" strokeOpacity={0.05} />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="#737373" fontSize="9" fontFamily="Outfit, sans-serif">
              {val}
            </text>
          </g>
        );
      })}

      {[...primary].reverse().map((s, si) => {
        const points = s.data.map((count, i) => ({
          x: pad.left + (i / Math.max(n - 1, 1)) * plotW,
          y: yPrimary(count),
        }));
        const bottomY = pad.top + plotH;
        const areaD = [
          `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`,
          ...points.slice(1).map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
          `L ${points[points.length - 1].x.toFixed(1)} ${bottomY}`,
          `L ${points[0].x.toFixed(1)} ${bottomY}`,
          'Z',
        ].join(' ');
        return (
          <path key={`area-${si}`} d={areaD} fill={s.color} fillOpacity={0.12} />
        );
      })}

      {series.map((s, si) => {
        const points = s.data.map((count, i) => ({
          x: pad.left + (i / Math.max(n - 1, 1)) * plotW,
          y: yPrimary(count),
          count,
        }));
        const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        return (
          <g key={si}>
            <path d={lineD} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2} strokeDasharray={s.dashed ? '5 3' : undefined} strokeLinecap="round" strokeLinejoin="round" />
            {!s.dashed && points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill="#010101" stroke={s.color} strokeWidth={1.5} />
            ))}
          </g>
        );
      })}

      {xPositions.map((x, i) => (
        <text
          key={i}
          x={x}
          y={h - 6}
          textAnchor="middle"
          fill="#737373"
          fontSize="9"
          fontFamily="Outfit, sans-serif"
        >
          {formatDay(dates[i])}
        </text>
      ))}

      <g transform={`translate(${pad.left}, ${h - 18})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${i * 105}, 0)`}>
            <circle cx={0} cy={-3} r={3.5} fill={s.color} />
            <text x={8} y={0} fill="#a3a3a3" fontSize="9" fontFamily="Outfit, sans-serif">{s.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

const TYPE_LABEL: Record<string, string> = {
  pageview: 'Visualizzazioni',
  click: 'Click',
  scroll_25: 'Scroll 25%',
  scroll_50: 'Scroll 50%',
  scroll_75: 'Scroll 75%',
  scroll_100: 'Scroll 100%',
  cookie_consent: 'Cookie Consent',
};

const CONSENT_COLORS: Record<string, string> = {
  all: '#22c55e',
  technical: '#f59e0b',
  none: '#ef4444',
};

const CONSENT_LABEL: Record<string, string> = {
  all: 'Accetta tutti',
  technical: 'Solo necessari',
  none: 'Rifiutati',
};

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  IT: { name: 'Italia', flag: '🇮🇹' },
  US: { name: 'Stati Uniti', flag: '🇺🇸' },
  GB: { name: 'Regno Unito', flag: '🇬🇧' },
  DE: { name: 'Germania', flag: '🇩🇪' },
  FR: { name: 'Francia', flag: '🇫🇷' },
  ES: { name: 'Spagna', flag: '🇪🇸' },
  CH: { name: 'Svizzera', flag: '🇨🇭' },
  NL: { name: 'Paesi Bassi', flag: '🇳🇱' },
  BE: { name: 'Belgio', flag: '🇧🇪' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  PT: { name: 'Portogallo', flag: '🇵🇹' },
  PL: { name: 'Polonia', flag: '🇵🇱' },
  RO: { name: 'Romania', flag: '🇷🇴' },
  SE: { name: 'Svezia', flag: '🇸🇪' },
  NO: { name: 'Norvegia', flag: '🇳🇴' },
  DK: { name: 'Danimarca', flag: '🇩🇰' },
  FI: { name: 'Finlandia', flag: '🇫🇮' },
  JP: { name: 'Giappone', flag: '🇯🇵' },
  CN: { name: 'Cina', flag: '🇨🇳' },
  BR: { name: 'Brasile', flag: '🇧🇷' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  IN: { name: 'India', flag: '🇮🇳' },
  KR: { name: 'Corea del Sud', flag: '🇰🇷' },
  MX: { name: 'Messico', flag: '🇲🇽' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  CL: { name: 'Cile', flag: '🇨🇱' },
  ZA: { name: 'Sudafrica', flag: '🇿🇦' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  KE: { name: 'Kenya', flag: '🇰🇪' },
  EG: { name: 'Egitto', flag: '🇪🇬' },
};

export default function DeepAnalyticsView() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/stats?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  if (loading && !stats) {
    return (
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-white">Caricamento Deep Analytics...</p>
        <p className="text-xs text-neutral-400 mt-1">Connessione ai log e metriche in tempo reale</p>
      </div>
    );
  }

  const scrollMax = Math.max(...(stats?.scrollDepth?.map((s) => s.count) || [1]));
  const eventsByTypeSegments =
    stats?.eventsByType?.map((e) => ({
      label: TYPE_LABEL[e.type] || e.type,
      value: e.count,
    })) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Analytics Toolbar */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-white">Deep Analytics & Real-Time Tracking</h3>
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {lastUpdated ? `Aggiornato: ${lastUpdated.toLocaleTimeString('it-IT')}` : 'Metriche di traffico in tempo reale'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
            {[
              { label: '24h', val: 1 },
              { label: '7g', val: 7 },
              { label: '30g', val: 30 },
              { label: '90g', val: 90 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setDays(opt.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  days === opt.val
                    ? 'bg-teal-400 text-black shadow-md shadow-teal-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                : 'bg-white/[0.04] border-white/[0.08] text-neutral-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-teal-400 animate-pulse' : 'bg-neutral-500'}`} />
            <span>Live Sync {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Visualizzazioni Pagina"
          value={stats?.pageViews?.toLocaleString() || '0'}
          color="#2dd4bf"
          secondary={
            stats?.trafficTodayYesterday && (
              <span>Oggi: {stats.trafficTodayYesterday.today.pageViews} · Ieri: {stats.trafficTodayYesterday.yesterday.pageViews}</span>
            )
          }
        >
          <span>👁️</span>
        </KpiCard>

        <KpiCard
          label="Sessioni Uniche"
          value={stats?.totalSessions?.toLocaleString() || '0'}
          color="#38bdf8"
          secondary={
            stats?.trafficTodayYesterday && (
              <span>Oggi: {stats.trafficTodayYesterday.today.sessions} · Ieri: {stats.trafficTodayYesterday.yesterday.sessions}</span>
            )
          }
        >
          <span>👥</span>
        </KpiCard>

        <KpiCard
          label="Click Tracciati"
          value={stats?.totalClicks?.toLocaleString() || '0'}
          color="#a855f7"
          secondary={
            stats?.trafficTodayYesterday && (
              <span>Oggi: {stats.trafficTodayYesterday.today.clicks} · Ieri: {stats.trafficTodayYesterday.yesterday.clicks}</span>
            )
          }
        >
          <span>👆</span>
        </KpiCard>

        <KpiCard
          label="Eventi Complessivi"
          value={stats?.totalEvents?.toLocaleString() || '0'}
          color="#f43f5e"
          secondary={<span>Ultimi {days} giorni</span>}
        >
          <span>📊</span>
        </KpiCard>
      </div>

      {/* Real World Map */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white text-base">Mappa Geografica dei Visitatori</h4>
            <p className="text-xs text-neutral-400">Distribuzione globale degli accessi e sessioni internazionali</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            {stats?.countries?.length || 0} Paesi rilevati
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
          <RealWorldMap
            countries={stats?.countries || []}
            cities={stats?.topCities || []}
            selectedCountry={selectedCountry}
            onCountryClick={(country) => setSelectedCountry(selectedCountry === country ? null : country)}
          />
        </div>
      </div>

      {/* Traffic Trend Charts & Donut Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Visits Chart */}
        <div className="lg:col-span-8 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-base">Trend Visite & Sessioni Giornaliere</h4>
            <span className="text-xs text-neutral-400 font-mono">Ultimi {days} giorni</span>
          </div>

          {stats?.dailyVisits && stats.dailyVisits.length > 0 ? (
            <MultiLineChart
              dates={stats.dailyVisits.map((d) => d.date)}
              series={[
                { name: 'Visite', color: '#2dd4bf', data: stats.dailyVisits.map((d) => d.count) },
                { name: 'Sessioni', color: '#38bdf8', data: (stats.dailySessions || stats.dailyVisits).map((d) => d.count) },
              ]}
              height={220}
            />
          ) : (
            <p className="text-xs text-neutral-500 py-12 text-center">Nessun dato temporale sufficiente registrato.</p>
          )}
        </div>

        {/* Donut Chart: Events by Type */}
        <div className="lg:col-span-4 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col items-center justify-between gap-4">
          <h4 className="font-bold text-white text-base text-center">Ripartizione per Tipo Evento</h4>
          {eventsByTypeSegments.length > 0 ? (
            <DonutChart segments={eventsByTypeSegments} size={160} thickness={28} />
          ) : (
            <p className="text-xs text-neutral-500 py-8">Nessun dato registrato</p>
          )}
        </div>
      </div>

      {/* Top Clicked Elements & Scroll Depth */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Clicked */}
        <div className="lg:col-span-7 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-base">Elementi Più Cliccati</h4>
            <span className="text-xs text-neutral-400 font-mono">Dizionario Formattato</span>
          </div>

          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {stats?.topClicked && stats.topClicked.length > 0 ? (
              stats.topClicked.slice(0, 10).map((tc, idx) => {
                const formatted = formatClickElement(tc.element);
                const maxClick = stats.topClicked[0]?.count || 1;
                return (
                  <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/[0.04] flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[75%]">
                        <span>{formatted.icon}</span>
                        <span className="font-semibold text-white truncate">{formatted.title}</span>
                      </div>
                      <span className="font-mono font-bold text-teal-300">{tc.count} click</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                        style={{ width: `${(tc.count / maxClick) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-neutral-500 py-8 text-center">Nessun click registrato finora.</p>
            )}
          </div>
        </div>

        {/* Scroll Depth & Country Distribution */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Scroll Depth */}
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col gap-4">
            <h4 className="font-bold text-white text-base">Profondità di Scroll Utenti</h4>
            <div className="flex flex-col gap-3">
              {stats?.scrollDepth?.map((s) => (
                <BarRow
                  key={s.depth}
                  label={`Scroll ${s.depth}%`}
                  value={s.count}
                  max={scrollMax}
                  color="#14b8a6"
                />
              )) || <p className="text-xs text-neutral-500">Nessun dato di scroll</p>}
            </div>
          </div>

          {/* Top Countries */}
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col gap-3">
            <h4 className="font-bold text-white text-base">Top Paesi</h4>
            <div className="grid grid-cols-2 gap-2">
              {stats?.countries?.slice(0, 6).map((c) => {
                const meta = COUNTRY_MAP[c.code] || { name: c.code, flag: '🌐' };
                return (
                  <div key={c.code} className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{meta.flag}</span>
                      <span className="text-neutral-300 font-medium">{meta.name}</span>
                    </span>
                    <span className="font-mono font-bold text-teal-300">{c.count}</span>
                  </div>
                );
              }) || <p className="text-xs text-neutral-500">Nessun paese registrato</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Live Events Stream */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white text-base">Stream Eventi in Tempo Reale</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">Live Feed</span>
          </div>
          <span className="text-xs text-neutral-400 font-mono">{stats?.recentEvents?.length || 0} eventi recenti</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <th className="py-2.5 px-3">Tipo Evento</th>
                <th className="py-2.5 px-3">URL Pagina</th>
                <th className="py-2.5 px-3">Dettagli / Target</th>
                <th className="py-2.5 px-3 text-right">Orario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats?.recentEvents && stats.recentEvents.length > 0 ? (
                stats.recentEvents.slice(0, 15).map((ev, idx) => {
                  const clickInfo = ev.data ? formatClickElement(ev.data) : null;
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/25">
                          {TYPE_LABEL[ev.type] || ev.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300 font-mono text-[11px] truncate max-w-[200px]">{ev.url}</td>
                      <td className="py-2.5 px-3 text-neutral-400 text-[11px] truncate max-w-[300px]">
                        {clickInfo ? (
                          <span className="flex items-center gap-1">
                            <span>{clickInfo.icon}</span>
                            <span>{clickInfo.title}</span>
                          </span>
                        ) : (
                          ev.data || '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-neutral-500 font-mono text-[10px]">
                        {new Date(ev.timestamp).toLocaleTimeString('it-IT')}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-500">Nessun evento recente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
