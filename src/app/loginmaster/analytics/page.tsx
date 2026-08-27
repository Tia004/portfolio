'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import WorldVectorMap from '@/app/components/WorldVectorMap';
import { formatClickElement } from '@/lib/click-elements-dictionary';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

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

// ── SVG Donut Chart ────────────────────────────────────────────

const DONUT_COLORS = ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#99f6e4', '#ccfbf1', '#f0fdfa'];

function DonutChart({
  segments,
  size = 160,
  thickness = 28,
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
        {/* Center hole label */}
        <text x={center} y={center - 6} textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700" fontFamily="Outfit, sans-serif">
          {total.toLocaleString()}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="#a3a3a3" fontSize="11" fontWeight="500" fontFamily="Outfit, sans-serif">
          totale
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
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

// ── Horizontal Bar ─────────────────────────────────────────────

function BarRow({ label, value, max, color = '#2dd4bf' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-400 truncate max-w-[70%]">{label}</span>
        <span className="text-neutral-300 font-mono text-xs">{value.toLocaleString()}</span>
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

// ── KPI Card ────────────────────────────────────────────────────

function KpiCard({ label, value, color, children, secondary }: { label: string; value: React.ReactNode; color: string; children: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.10] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="shrink-0" style={{ color }}>{children}</span>
        <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</p>
      {secondary && <div className="mt-1 text-[11px] text-neutral-500">{secondary}</div>}
    </div>
  );
}

function TrafficTrend({ today, yesterday }: { today: number; yesterday: number }) {
  const delta = today - yesterday;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#a3a3a3';

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>Oggi {today.toLocaleString()}</span>
      {trend === 'up' ? (
        <svg aria-label="In aumento" className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      ) : trend === 'down' ? (
        <svg aria-label="In calo" className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      ) : (
        <svg aria-label="Stabile" className="w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      )}
      <span style={{ color: trendColor }}>{delta > 0 ? '+' : ''}{delta.toLocaleString()}</span>
      <span className="text-neutral-600">· Ieri {yesterday.toLocaleString()}</span>
    </span>
  );
}

// ── Inline SVG Icons (replacing emoji for consistency) ────────

const IconEvents = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const IconEye = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconClick = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
  </svg>
);

const IconCookie = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 009-9H3a9 9 0 009 9z" />
    <circle cx="8" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="16" cy="9" r="1" fill="currentColor" />
    <circle cx="10" cy="15" r="1" fill="currentColor" />
    <circle cx="14" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

// ── Type Label Helper ──────────────────────────────────────────

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

// ── Country code → name + flag ─────────────────────────────────

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
  PK: { name: 'Pakistan', flag: '🇵🇰' },
  BD: { name: 'Bangladesh', flag: '🇧🇩' },
  TW: { name: 'Taiwan', flag: '🇹🇼' },
  TH: { name: 'Thailandia', flag: '🇹🇭' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  PH: { name: 'Filippine', flag: '🇵🇭' },
  NZ: { name: 'Nuova Zelanda', flag: '🇳🇿' },
  AE: { name: 'Emirati Arabi Uniti', flag: '🇦🇪' },
  IL: { name: 'Israele', flag: '🇮🇱' },
  TR: { name: 'Turchia', flag: '🇹🇷' },
};

// ── Unified SVG World Vector Map ───────────────────────────────

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function formatDay(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]} ${d}`;
}

// ── SVG Multi-Line Chart (multi-series, used for consent trends) ──

function MultiLineChart({
  series,
  dates,
  height = 220,
}: {
  series: { name: string; color: string; data: number[]; dashed?: boolean; secondary?: boolean }[];
  dates: string[];
  height?: number;
}) {
  // Split series into primary (left Y axis) and secondary (right Y axis)
  const primary = series.filter(s => !s.secondary);
  const secondary = series.filter(s => s.secondary);

  const pad = { top: 16, right: secondary.length > 0 ? 40 : 12, bottom: 30, left: 36 };
  const w = 600;
  const h = height;
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Primary Y axis (visits / sessions)
  const primaryValues = primary.flatMap(s => s.data);
  const max = Math.max(...primaryValues, 1);
  const yTicks = 4;
  const yStep = Math.ceil(max / yTicks) || 1;

  // Secondary Y axis (pages per session)
  const secondaryValues = secondary.flatMap(s => s.data);
  const secMax = Math.max(...secondaryValues, 0.1);
  const secTicks = 3;
  const secStep = Math.ceil(secMax / secTicks) || 1;

  const n = dates.length || 7;

  // Scale helpers
  const yPrimary = (val: number) => pad.top + plotH - (val / (max || 1)) * plotH;
  const ySecondary = (val: number) => pad.top + plotH - (val / (secMax || 1)) * plotH;

  // X positions for date labels
  const xPositions = dates.map((_, i) => pad.left + (i / Math.max(n - 1, 1)) * plotW);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid lines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = i * yStep;
        const y = pad.top + plotH - (val / (max || 1)) * plotH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#ffffff" strokeOpacity={0.05} />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="#737373" fontSize="10" fontFamily="Outfit, sans-serif">
              {val}
            </text>
          </g>
        );
      })}

      {/* Secondary Y axis labels (right side) */}
      {secondary.length > 0 && Array.from({ length: secTicks + 1 }, (_, i) => {
        const val = i * secStep;
        const y = ySecondary(val);
        return (
          <g key={`sec-${i}`}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#ffffff" strokeOpacity={0.03} strokeDasharray="3 4" />
            <text x={w - pad.right + 6} y={y + 4} textAnchor="start" fill={secondary[0]?.color ?? '#a3a3a3'} fontSize="9" fontFamily="Outfit, sans-serif">
              {Number.isInteger(val) ? val : val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Area fills — primary series only (rendered before lines for correct layering) */}
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
          <path key={`area-${si}`} d={areaD} fill={s.color} fillOpacity={0.10} />
        );
      })}

      {/* Lines + dots per series */}
      {series.map((s, si) => {
        const scaleY = s.secondary ? ySecondary : yPrimary;
        const points = s.data.map((count, i) => ({
          x: pad.left + (i / Math.max(n - 1, 1)) * plotW,
          y: scaleY(count),
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

      {/* Day labels */}
      {xPositions.map((x, i) => (
        <text
          key={i}
          x={x}
          y={h - 8}
          textAnchor="middle"
          fill="#737373"
          fontSize="9"
          fontFamily="Outfit, sans-serif"
        >
          {formatDay(dates[i])}
        </text>
      ))}

      {/* Legend row — above day labels */}
      <g transform={`translate(${pad.left}, ${h - 20})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${i * 110}, 0)`}>
            <circle cx={0} cy={-4} r={4} fill={s.color} />
            <text x={10} y={0} fill="#a3a3a3" fontSize="9" fontFamily="Outfit, sans-serif">{s.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function typeLabel(t: string) {
  return TYPE_LABEL[t] || t;
}

// ═══════════════════════════════════════════════════════════════
//  Analytics Dashboard
// ═══════════════════════════════════════════════════════════════

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<7 | 30 | 90>(() => {
    try {
      const saved = localStorage.getItem('analytics_timeWindow');
      const n = saved ? parseInt(saved) : 7;
      return [7, 30, 90].includes(n) ? (n as 7 | 30 | 90) : 7;
    } catch { return 7; }
  });
  const [chartTransition, setChartTransition] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/stats?days=${timeWindow}`);
      if (res.status === 401) {
        router.push('/loginmaster');
        return;
      }
      if (!res.ok) throw new Error('Impossibile caricare le statistiche');
      const data = await res.json();
      setStats(data);
      // Double-rAF ensures browser paints the dimmed frame before restoring opacity
      requestAnimationFrame(() => requestAnimationFrame(() => setChartTransition(false)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel recupero delle statistiche');
    } finally {
      setLoading(false);
    }
  }, [router, timeWindow]);

  useEffect(() => {
    try { localStorage.setItem('analytics_timeWindow', String(timeWindow)); } catch {}
    void Promise.resolve().then(fetchStats);
  }, [timeWindow, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#010101] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 text-sm tracking-wider">Caricamento analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#010101] text-white flex items-center justify-center font-sans">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-red-400 mb-2">Errore</p>
          <p className="text-neutral-400 text-sm mb-4">{error || 'Nessun dato disponibile'}</p>
          <button onClick={fetchStats} className="px-5 py-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl hover:bg-teal-500/20 transition-colors text-sm font-medium">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const eventTypesForDonut = stats.eventsByType.map(e => ({
    label: typeLabel(e.type),
    value: e.count,
  }));

  const maxClickCount = Math.max(...stats.topClicked.map(c => c.count), 1);
  const allConsentCount = stats.cookieConsentBreakdown.find(c => c.level === 'all')?.count || 0;
  const totalConsentCount = stats.cookieConsentBreakdown.reduce((s, c) => s + c.count, 0);
  const acceptanceRate = totalConsentCount > 0 ? Math.round((allConsentCount / totalConsentCount) * 100) : 0;
  const trafficComparison = stats.trafficTodayYesterday;
  const todayAcceptance = stats.todayConsentRate?.todayCount > 0 ? stats.todayConsentRate.today : null;
  const acceptanceDelta = stats.todayConsentRate && stats.todayConsentRate.yesterdayCount > 0
    ? stats.todayConsentRate.today - stats.todayConsentRate.yesterday
    : null;
  const todayAcceptanceColor = (todayAcceptance ?? acceptanceRate) >= 70 ? '#22c55e' : (todayAcceptance ?? acceptanceRate) >= 40 ? '#f59e0b' : '#ef4444';
  const acceptanceDeltaColor = acceptanceDelta === null ? '#737373' : acceptanceDelta > 0 ? '#4ade80' : acceptanceDelta < 0 ? '#f87171' : '#a3a3a3';

  const consentBreakdownForDonut = stats.cookieConsentBreakdown.map(c => ({
    label: CONSENT_LABEL[c.level] || c.level,
    value: c.count,
    color: CONSENT_COLORS[c.level] || '#6b7280',
  }));

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-200 font-sans p-6 md:p-10 relative overflow-x-hidden">
      {/* Molten Metal Shader Background */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
        <MoltenMetal
          color1="#05bc8e"
          color2="#0effc1"
          color3="#ffffff"
          speed={0.25}
          scale={5.5}
          detail={2}
          glow={1.4}
          coreSize={0.1}
          swirl={1.35}
          fold={-0.15}
          blackPoint={0.03}
          brightness={0.3}
          colorMode="molten"
          grain={false}
          mouseInteraction={false}
          mouseStrength={0.15}
          opacity={1}
        />
      </div>

      {/* Subtle vignette layer */}
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-black/45 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-6 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/loginmaster/dashboard" className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                <span className="text-teal-400">Analytics</span> Portal
              </h1>
            </div>
            <p className="text-neutral-500 text-sm mt-1">Statistiche visitatori, cookie e interazioni sul sito pubblico.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/loginmaster/dashboard"
              className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-400 hover:text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Progetti
            </Link>
            {/* Time window toggle */}
            <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5">
              {([7, 30, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => {
                    if (d !== timeWindow) setChartTransition(true);
                    setTimeWindow(d);
                  }}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                    timeWindow === d
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {d}gg
                </button>
              ))}
            </div>
            <button
              onClick={fetchStats}
              className="bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 font-medium py-2 px-4 rounded-xl transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Aggiorna
            </button>
          </div>
        </header>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <KpiCard
            label="Eventi totali"
            value={stats.totalEvents.toLocaleString()}
            color="#2dd4bf"
            secondary={trafficComparison ? <TrafficTrend today={trafficComparison.today.events} yesterday={trafficComparison.yesterday.events} /> : 'Confronto non disponibile'}
          >
            <IconEvents />
          </KpiCard>
          <KpiCard
            label="Sessioni uniche"
            value={stats.totalSessions.toLocaleString()}
            color="#5eead4"
            secondary={trafficComparison ? <TrafficTrend today={trafficComparison.today.sessions} yesterday={trafficComparison.yesterday.sessions} /> : 'Confronto non disponibile'}
          >
            <IconUsers />
          </KpiCard>
          <KpiCard
            label="Page views"
            value={stats.pageViews.toLocaleString()}
            color="#14b8a6"
            secondary={trafficComparison ? <TrafficTrend today={trafficComparison.today.pageViews} yesterday={trafficComparison.yesterday.pageViews} /> : 'Confronto non disponibile'}
          >
            <IconEye />
          </KpiCard>
          <KpiCard
            label="Click"
            value={stats.totalClicks.toLocaleString()}
            color="#0d9488"
            secondary={trafficComparison ? <TrafficTrend today={trafficComparison.today.clicks} yesterday={trafficComparison.yesterday.clicks} /> : 'Confronto non disponibile'}
          >
            <IconClick />
          </KpiCard>
          <KpiCard label="Copertura geografica" value={(stats.uniqueCities ?? stats.topCities.length).toLocaleString()} color="#a78bfa">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" /></svg>
          </KpiCard>
          <KpiCard
            label="Tasso accettazione oggi"
            value={(
              <span className="inline-flex items-center gap-1.5">
                {todayAcceptance === null ? '—' : `${todayAcceptance}%`}
                {stats.todayConsentRate?.trend === 'up' ? (
                  <svg aria-label="In aumento" className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                ) : stats.todayConsentRate?.trend === 'down' ? (
                  <svg aria-label="In calo" className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                ) : stats.todayConsentRate ? (
                  <svg aria-label="Stabile" className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                ) : null}
                {acceptanceDelta !== null && (
                  <span className="text-sm font-semibold" style={{ color: acceptanceDeltaColor }}>
                    {acceptanceDelta > 0 ? '+' : ''}{acceptanceDelta}%
                  </span>
                )}
              </span>
            )}
            color={todayAcceptanceColor}
            secondary={stats.todayConsentRate ? `Ieri: ${stats.todayConsentRate.yesterday}%` : undefined}
          >
            <IconCookie />
          </KpiCard>
          {stats.consentSessionRate && (() => {
            const csr = stats.consentSessionRate.consentSessions ?? 0;
            const total = Math.max(stats.totalSessions, 1);
            const rate = Math.round((csr / total) * 100);
            const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';
            return (
            <KpiCard
              label="Sessioni con consenso"
              value={`${rate}%`}
              color={color}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </KpiCard>
            );
          })()}
        </div>

        {/* ── Panoramica: Visite + Consensi affiancati ── */}
        <div className="mb-8">
          <div className={`bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 transition-opacity duration-300 ${chartTransition ? 'opacity-40' : 'opacity-100'}`}>
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Panoramica — ultimi {timeWindow} giorni
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Visits + Sessions */}
              <div>
                <h4 className="text-neutral-400 text-xs uppercase tracking-wider mb-3">Visite e sessioni</h4>
                {stats.dailyVisits.length === 0 ? (
                  <p className="text-neutral-500 text-sm py-8 text-center">Nessun dato</p>
                ) : (
                  <MultiLineChart
                    series={[
                      { name: 'Page views', color: '#2dd4bf', data: stats.dailyVisits.map(d => d.count) },
                      { name: 'Sessioni', color: '#818cf8', data: stats.dailySessions.map(d => d.count) },
                      { name: 'Pagine/sess.', color: '#f59e0b', data: stats.dailyVisits.map((d, i) => {
                        const sessions = stats.dailySessions[i]?.count || 1;
                        return Math.round((d.count / sessions) * 10) / 10;
                      }), dashed: true, secondary: true },
                    ]}
                    dates={stats.dailyVisits.map(d => d.date)}
                    height={200}
                  />
                )}
              </div>
              {/* Right: Consent trend */}
              <div>
                <h4 className="text-neutral-400 text-xs uppercase tracking-wider mb-3">Andamento consensi</h4>
                {stats.dailyConsent.length === 0 ? (
                  <p className="text-neutral-500 text-sm py-8 text-center">Nessun dato</p>
                ) : (
                  <MultiLineChart
                    series={[
                      { name: 'Accetta tutti', color: CONSENT_COLORS.all, data: stats.dailyConsent.map(d => d.all) },
                      { name: 'Solo necessari', color: CONSENT_COLORS.technical, data: stats.dailyConsent.map(d => d.technical) },
                      { name: 'Rifiutati', color: CONSENT_COLORS.none, data: stats.dailyConsent.map(d => d.none) },
                    ]}
                    dates={stats.dailyConsent.map(d => d.date)}
                    height={200}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Donut: Events by type */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Distribuzione eventi
            </h3>
            <DonutChart segments={eventTypesForDonut} size={160} thickness={28} />
          </div>

          {/* Donut: Cookie consent by level */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Consensi per tipo
            </h3>
            {consentBreakdownForDonut.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8">Nessun consenso ancora tracciato</p>
            ) : (
              <DonutChart segments={consentBreakdownForDonut} size={160} thickness={28} />
            )}
          </div>

          {/* Donut: Scroll depth */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Profondità di scroll
            </h3>
            <DonutChart
              segments={stats.scrollDepth.map(s => ({
                label: typeLabel(s.depth),
                value: s.count,
              }))}
              size={160}
              thickness={28}
            />
          </div>
        </div>

        {/* ── Top Città ── */}
        {stats.topCities.length > 0 && (
          <div className="mb-8">
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                Top città
              </h3>
              <div className="flex flex-wrap gap-3">
                {stats.topCities.map((c, i) => {
                  const maxCity = stats.topCities[0]?.count || 1;
                  // Font-size based visual weight instead of CSS scale (avoids layout overlaps)
                  const fontSize = 0.75 + (c.count / maxCity) * 0.75; // 0.75rem→1.5rem
                  const opacity = 0.5 + (c.count / maxCity) * 0.5;    // 0.5→1.0
                  return (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 hover:border-violet-500/30 transition-colors"
                      style={{ opacity, fontSize: `${fontSize}rem` }}
                    >
                      <p className="text-white font-medium whitespace-nowrap">{c.city}</p>
                      <p className="text-violet-400 font-mono mt-0.5">{c.count.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Top clicked + Countries + Recent ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Top clicked */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                Elementi più cliccati
              </h3>
              <span className="text-[10px] font-mono text-neutral-500">
                {stats.topClicked.reduce((sum, item) => sum + item.count, 0)} click totali
              </span>
            </div>
            {stats.topClicked.length === 0 ? (
              <p className="text-neutral-500 text-sm py-6 text-center">Nessun click tracciato</p>
            ) : (
              <div className="space-y-3.5">
                {stats.topClicked.slice(0, 8).map((item, i) => {
                  const info = formatClickElement(item.element);
                  const pct = maxClickCount > 0 ? (item.count / maxClickCount) * 100 : 0;
                  const itemColor = info.color || DONUT_COLORS[i % DONUT_COLORS.length];

                  return (
                    <div key={i} className="group p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm">{info.icon}</span>
                            <span className="text-white font-medium text-xs truncate">{info.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-400 font-mono">
                              {info.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-neutral-500 truncate">{info.description}</span>
                            <code className="text-[9px] text-neutral-600 font-mono bg-black/30 px-1 rounded shrink-0">
                              {item.element}
                            </code>
                          </div>
                        </div>
                        <span className="text-teal-400 font-mono font-bold text-xs shrink-0">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: itemColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Countries map */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 md:col-span-2">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Visite per paese
            </h3>
            {stats.countries.length === 0 ? (
              <p className="text-neutral-500 text-sm py-8 text-center">Nessun dato geografico disponibile</p>
            ) : (
              <WorldVectorMap
                countries={stats.countries}
                selectedCountry={selectedCountry}
                onCountryClick={(country) => {
                  setSelectedCountry(selectedCountry === country ? null : country);
                  setSelectedCity(null);
                }}
              />
            )}
          </div>

          {/* ── City breakdown for selected country ── */}
          {selectedCountry && (() => {
            const entry = stats.citiesByCountry?.find(c => c.country === selectedCountry);
            const maxCity = entry ? Math.max(...entry.cities.map(c => c.count), 1) : 1;
            const countryTotal = entry?.cities.reduce((total, city) => total + city.count, 0) ?? 0;
            const countryLabel = (() => { const e = COUNTRY_MAP[selectedCountry]; return e ? `${e.flag} ${e.name}` : selectedCountry; })();
            return (
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  Città in {countryLabel}
                  <button onClick={() => { setSelectedCountry(null); setSelectedCity(null); }} className="ml-auto text-neutral-500 hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </h3>
                {!entry || entry.cities.length === 0 ? (
                  <p className="text-neutral-500 text-xs py-4 text-center">Nessuna città tracciata per questo paese</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {entry.cities.slice(0, 15).map(c => {
                      const visualWeight = c.count / maxCity;
                      const share = countryTotal > 0 ? Math.round((c.count / countryTotal) * 100) : 0;
                      const size = 0.7 + visualWeight * 0.7;
                      const opacity = 0.45 + visualWeight * 0.55;
                      const isSelected = selectedCity === c.city;
                      return (
                        <button
                          key={c.city}
                          type="button"
                          onClick={() => setSelectedCity(isSelected ? null : c.city)}
                          aria-pressed={isSelected}
                          className={`text-left bg-white/[0.03] border rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-violet-400/70 bg-violet-500/15 ring-1 ring-violet-400/30'
                              : 'border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/[0.06]'
                          }`}
                          style={{ fontSize: `${size}rem`, opacity }}
                        >
                          <span className="text-white font-medium">{c.city}</span>
                          <span className="text-violet-400 ml-1.5 text-[0.85em] font-mono">
                            {c.count.toLocaleString()} ({share}%)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Attività recente
              {selectedCountry && (
                <span className="ml-2 inline-flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/25 rounded-full px-2.5 py-0.5 text-[11px] text-teal-400 font-medium">
                  {(() => { const entry = COUNTRY_MAP[selectedCountry]; return entry ? `${entry.flag} ${entry.name}` : selectedCountry; })()}
                  {selectedCity && <span className="text-teal-300/80">· {selectedCity}</span>}
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCountry(null); setSelectedCity(null); }} className="text-teal-400/60 hover:text-teal-300 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
            </h3>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {(() => {
                const filtered = stats.recentEvents.filter(ev => {
                  if (!selectedCountry && !selectedCity) return true;
                  try {
                    const d = JSON.parse(ev.data || '{}');
                    if (selectedCountry && d._country !== selectedCountry) return false;
                    if (selectedCity && d._city !== selectedCity) return false;
                    return true;
                  } catch { return false; }
                });
                if (filtered.length === 0) {
                  return <p className="text-neutral-500 text-sm py-6 text-center">{selectedCity ? `Nessun evento da ${selectedCity}` : 'Nessun evento da questo paese'}</p>;
                }
                return filtered.slice(0, 12).map((ev, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                  <span className="text-[10px] uppercase tracking-wider bg-white/[0.04] text-neutral-500 px-1.5 py-0.5 rounded-md shrink-0 font-mono">
                    {ev.type}
                  </span>
                  <span className="text-neutral-400 text-xs truncate flex-1">{ev.url}</span>
                  <span className="text-neutral-600 text-[10px] font-mono shrink-0">
                    {new Date(parseInt(ev.timestamp)).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ));
            })()}
            </div>
          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-neutral-600 text-xs mt-8">
          I dati sono anonimizzati e raccolti nel rispetto della privacy. Cookie consent tracciato via analytics.
        </p>
      </div>
    </div>
  );
}
