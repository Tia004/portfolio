import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET(req: NextRequest) {
  // Auth check — must be logged in
  const token = req.cookies.get('master_session')?.value;
  const session = token ? await decrypt(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Time window for daily charts (7, 30, or 90 days)
  const rawDays = req.nextUrl.searchParams.get('days');
  const days = [7, 30, 90].includes(Number(rawDays)) ? Number(rawDays) : 7;
  const dayMs = 24 * 60 * 60 * 1000;
  const cutoff = BigInt(Date.now() - days * dayMs);

  // Common filter to strictly exclude all dashboard and admin paths
  const nonAdminFilter = {
    AND: [
      { NOT: { url: { contains: '/loginmaster' } } },
      { NOT: { url: { contains: '/api/' } } },
      { NOT: { url: { contains: '/master/' } } },
    ],
  };

  try {
    const [totalEvents, totalSessions, pageViews, totalClicks, trafficTodayYesterday, topClicked, recentEvents, scrollDepth, eventsByType, cookieConsentBreakdown, countries, dailyVisits, dailySessions, dailyConsent, topCities, todayConsentRate, consentSessionRate, cityAnalytics] =
      await Promise.all([
        prisma.analyticsEvent.count({ where: nonAdminFilter }),
        prisma.analyticsEvent.groupBy({ by: ['sessionId'], where: nonAdminFilter, _count: true }).then((r: { sessionId: string; _count: number }[]) => r.length),
        prisma.analyticsEvent.count({ where: { ...nonAdminFilter, type: 'pageview' } }),
        prisma.analyticsEvent.count({ where: { ...nonAdminFilter, type: 'click' } }),

        // Traffic comparison: today vs yesterday. Sessions are unique per day,
        // while the other metrics count their corresponding event types.
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, timestamp: { gte: BigInt(Date.now() - 2 * dayMs) } },
          select: { type: true, timestamp: true, sessionId: true },
        }).then((rows: { type: string; timestamp: bigint; sessionId: string }[]) => {
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const yesterday = new Date(Date.now() - dayMs);
          const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          const empty = () => ({ events: 0, sessions: 0, pageViews: 0, clicks: 0, sessionIds: new Set<string>() });
          const byDay: Record<string, ReturnType<typeof empty>> = {
            [todayKey]: empty(),
            [yesterdayKey]: empty(),
          };
          for (const row of rows) {
            const date = new Date(Number(row.timestamp));
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const bucket = byDay[key];
            if (!bucket) continue;
            bucket.events++;
            bucket.sessionIds.add(row.sessionId);
            if (row.type === 'pageview') bucket.pageViews++;
            if (row.type === 'click') bucket.clicks++;
          }
          return {
            today: { ...byDay[todayKey], sessions: byDay[todayKey].sessionIds.size, sessionIds: undefined },
            yesterday: { ...byDay[yesterdayKey], sessions: byDay[yesterdayKey].sessionIds.size, sessionIds: undefined },
          };
        }).then((result) => ({
          today: { events: result.today.events, sessions: result.today.sessions, pageViews: result.today.pageViews, clicks: result.today.clicks },
          yesterday: { events: result.yesterday.events, sessions: result.yesterday.sessions, pageViews: result.yesterday.pageViews, clicks: result.yesterday.clicks },
        })),

        // Top clicked elements
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: 'click' },
          select: { data: true },
          take: 500,
        }).then((rows: { data: string | null }[]) => {
          const counts: Record<string, number> = {};
          for (const r of rows) {
            try {
              const d = JSON.parse(r.data || '{}');
              const el = d.element || '(unknown)';
              counts[el] = (counts[el] || 0) + 1;
            } catch {}
          }
          return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([element, count]) => ({ element, count }));
        }),

        // Recent events (last 50)
        prisma.analyticsEvent.findMany({
          where: nonAdminFilter,
          orderBy: { timestamp: 'desc' },
          take: 50,
          select: { type: true, url: true, data: true, timestamp: true, sessionId: true },
        }).then((rows: { type: string; url: string; data: string | null; timestamp: bigint; sessionId: string }[]) => rows.map(r => ({
          ...r,
          timestamp: r.timestamp.toString(),
        }))),

        // Scroll depth
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: { startsWith: 'scroll_' } },
          select: { type: true },
        }).then((rows: { type: string }[]) => {
          const counts: Record<string, number> = {};
          for (const r of rows) {
            counts[r.type] = (counts[r.type] || 0) + 1;
          }
          return Object.entries(counts).map(([depth, count]) => ({ depth, count }));
        }),

        // Events by type
        prisma.analyticsEvent.groupBy({
          by: ['type'],
          where: nonAdminFilter,
          _count: true,
        }).then((rows: { type: string; _count: number }[]) =>
          rows.map(r => ({ type: r.type, count: r._count })).sort((a, b) => b.count - a.count)
        ),

        // Cookie consent breakdown by level
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: 'cookie_consent' },
          select: { data: true },
          take: 1000,
        }).then((rows: { data: string | null }[]) => {
          const counts: Record<string, number> = { all: 0, technical: 0, none: 0 };
          for (const r of rows) {
            try {
              const d = JSON.parse(r.data || '{}');
              const categories: string[] = d.categories || [];
              if (categories.includes('all')) counts.all++;
              else if (categories.includes('none') || categories.length === 0) counts.none++;
              else counts.technical++;
            } catch {
              counts.none++;
            }
          }
          return Object.entries(counts)
            .filter(([, count]) => count > 0)
            .map(([level, count]) => ({ level, count }));
        }),

        // Country breakdown from pageview events
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: 'pageview' },
          select: { data: true },
          take: 5000,
        }).then((rows: { data: string | null }[]) => {
          const counts: Record<string, number> = {};
          for (const r of rows) {
            try {
              const d = JSON.parse(r.data || '{}');
              const country: string = d._country;
              if (country && country.length === 2) {
                counts[country] = (counts[country] || 0) + 1;
              }
            } catch {}
          }
          return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([code, count]) => ({ code, count }));
        }),

        // Daily visits — last N days
        prisma.analyticsEvent.findMany({
          where: {
            ...nonAdminFilter,
            type: 'pageview',
            timestamp: { gte: cutoff },
          },
          select: { timestamp: true },
          take: 20000,
        }).then((rows: { timestamp: bigint }[]) => {
          const counts: Record<string, number> = {};
          // Pre-fill all N days with 0, newest last
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            counts[key] = 0;
          }
          for (const r of rows) {
            const d = new Date(Number(r.timestamp));
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (counts[key] !== undefined) counts[key]++;
          }
          return Object.entries(counts).map(([date, count]) => ({ date, count }));
        }),

        // Daily unique sessions — last N days
        prisma.analyticsEvent.findMany({
          where: {
            ...nonAdminFilter,
            type: 'pageview',
            timestamp: { gte: cutoff },
          },
          select: { timestamp: true, sessionId: true },
          take: 20000,
        }).then((rows: { timestamp: bigint; sessionId: string }[]) => {
          // Per day, track unique sessionIds in a Set
          const sessionsByDay: Record<string, Set<string>> = {};
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            sessionsByDay[key] = new Set();
          }
          for (const r of rows) {
            const d = new Date(Number(r.timestamp));
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const set = sessionsByDay[key];
            if (set) set.add(r.sessionId);
          }
          return Object.entries(sessionsByDay).map(([date, set]) => ({ date, count: set.size }));
        }),

        // Daily consent trends — last N days, grouped by day + level
        prisma.analyticsEvent.findMany({
          where: {
            ...nonAdminFilter,
            type: 'cookie_consent',
            timestamp: { gte: cutoff },
          },
          select: { timestamp: true, data: true },
          take: 10000,
        }).then((rows: { timestamp: bigint; data: string | null }[]) => {
          // Pre-fill: one entry per day with all/technical/none at 0
          const consentDays: { date: string; all: number; technical: number; none: number }[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            consentDays.push({ date: key, all: 0, technical: 0, none: 0 });
          }
          const lookup = new Map(consentDays.map(d => [d.date, d]));
          for (const r of rows) {
            const d = new Date(Number(r.timestamp));
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const entry = lookup.get(key);
            if (!entry) continue;
            try {
              const data = JSON.parse(r.data || '{}');
              const categories: string[] = data.categories || [];
              if (categories.includes('all')) entry.all++;
              else if (categories.includes('none') || categories.length === 0) entry.none++;
              else entry.technical++;
            } catch {
              entry.none++;
            }
          }
          return consentDays;
        }),

        // Top cities from pageview events
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: 'pageview' },
          select: { data: true },
          take: 5000,
        }).then((rows: { data: string | null }[]) => {
          const counts: Record<string, number> = {};
          for (const r of rows) {
            try {
              const d = JSON.parse(r.data || '{}');
              const city: string = d._city;
              if (city && city.length > 0) {
                counts[city] = (counts[city] || 0) + 1;
              }
            } catch {}
          }
          return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 12)
            .map(([city, count]) => ({ city, count }));
        }),

        // Today vs yesterday consent rate
        prisma.analyticsEvent.findMany({
          where: {
            ...nonAdminFilter,
            type: 'cookie_consent',
            timestamp: { gte: BigInt(Date.now() - 2 * dayMs) },
          },
          select: { timestamp: true, data: true },
          take: 5000,
        }).then((rows: { timestamp: bigint; data: string | null }[]) => {
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const yesterday = new Date(Date.now() - dayMs);
          const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          const counts: Record<string, { all: number; total: number }> = {
            [todayKey]: { all: 0, total: 0 },
            [yesterdayKey]: { all: 0, total: 0 },
          };
          for (const r of rows) {
            const d = new Date(Number(r.timestamp));
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const entry = counts[key];
            if (!entry) continue;
            entry.total++;
            try {
              const data = JSON.parse(r.data || '{}');
              if (data.categories?.includes('all')) entry.all++;
            } catch {}
          }
          const todayRate = counts[todayKey].total > 0
            ? Math.round((counts[todayKey].all / counts[todayKey].total) * 100)
            : 0;
          const yesterdayRate = counts[yesterdayKey].total > 0
            ? Math.round((counts[yesterdayKey].all / counts[yesterdayKey].total) * 100)
            : 0;
          const trend: 'up' | 'down' | 'flat' = todayRate > yesterdayRate ? 'up' : todayRate < yesterdayRate ? 'down' : 'flat';
          return { today: todayRate, yesterday: yesterdayRate, todayCount: counts[todayKey].total, yesterdayCount: counts[yesterdayKey].total, trend };
        }),

        // Sessions with consent — unique sessionIds that have cookie_consent events
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: 'cookie_consent' },
          select: { sessionId: true },
          distinct: ['sessionId'],
          take: 50000,
        }).then((rows: { sessionId: string }[]) => ({
          consentSessions: rows.length,
        })),

        // City analytics — one pageview scan feeds both the unique-city KPI
        // and the country → city drill-down panel.
        prisma.analyticsEvent.findMany({
          where: { ...nonAdminFilter, type: 'pageview' },
          select: { data: true },
          take: 50000,
        }).then((rows: { data: string | null }[]) => {
          const uniqueCitySet = new Set<string>();
          const citiesByCountryMap = new Map<string, Map<string, number>>();

          for (const r of rows) {
            try {
              const d = JSON.parse(r.data || '{}');
              const country: string = d._country;
              const city: string = d._city;

              // Preserve the previous uniqueCities semantics: a valid city is
              // counted even when its country metadata is missing.
              if (city && city.length > 0) uniqueCitySet.add(city);

              if (!country || !city) continue;
              if (!citiesByCountryMap.has(country)) citiesByCountryMap.set(country, new Map());
              const cityMap = citiesByCountryMap.get(country)!;
              cityMap.set(city, (cityMap.get(city) || 0) + 1);
            } catch {}
          }

          const citiesByCountry: { country: string; cities: { city: string; count: number }[] }[] = [];
          for (const [country, cityMap] of citiesByCountryMap) {
            const cities = [...cityMap.entries()]
              .sort(([, a], [, b]) => b - a)
              .map(([city, count]) => ({ city, count }));
            citiesByCountry.push({ country, cities });
          }

          return {
            uniqueCities: uniqueCitySet.size,
            citiesByCountry: citiesByCountry.sort((a, b) => {
              const totalA = a.cities.reduce((s, c) => s + c.count, 0);
              const totalB = b.cities.reduce((s, c) => s + c.count, 0);
              return totalB - totalA;
            }),
          };
        }),
      ]);

    return NextResponse.json({
      totalEvents,
      totalSessions,
      pageViews,
      totalClicks,
      trafficTodayYesterday,
      topClicked,
      recentEvents,
      scrollDepth,
      eventsByType,
      cookieConsentBreakdown,
      countries,
      dailyVisits,
      dailySessions,
      dailyConsent,
      topCities,
      todayConsentRate,
      consentSessionRate,
      uniqueCities: cityAnalytics.uniqueCities,
      citiesByCountry: cityAnalytics.citiesByCountry,
    });
  } catch (err) {
    console.error('[analytics/stats] Error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
