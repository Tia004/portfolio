import { NextRequest } from 'next/server';

/**
 * Minimal in-memory cache to avoid re-fetching the same URL repeatedly.
 * TTL: 30 minutes, max 100 entries.
 */
const cache = new Map<string, { data: UnfurlData; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const MAX_CACHE = 100;

interface UnfurlData {
  title: string;
  description: string;
  favicon: string;
  image: string;
  url: string;
}

/**
 * Extract OG / meta tags from HTML using regex (fast, no DOM parser needed).
 */
function parseMeta(html: string, url: string): UnfurlData {
  const getMeta = (prop: string): string => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']` +
      `|` +
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i'
    );
    const m = html.match(re);
    return m?.[1] || m?.[2] || '';
  };

  const title =
    getMeta('og:title') ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()) ||
    '';

  const description =
    getMeta('og:description') ||
    getMeta('description') ||
    '';

  const image = getMeta('og:image');

  // Favicon: try link[rel=icon] or fallback to /favicon.ico on same origin
  let favicon = '';
  const iconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (iconMatch?.[1]) {
    favicon = iconMatch[1];
    if (favicon.startsWith('/')) {
      try {
        const u = new URL(url);
        favicon = `${u.origin}${favicon}`;
      } catch { /* ignore */ }
    } else if (!favicon.startsWith('http')) {
      favicon = new URL(favicon, url).href;
    }
  } else {
    try {
      const u = new URL(url);
      favicon = `${u.origin}/favicon.ico`;
    } catch { /* ignore */ }
  }

  // Make image URL absolute
  let absImage = image;
  if (absImage && absImage.startsWith('/')) {
    try {
      const u = new URL(url);
      absImage = `${u.origin}${absImage}`;
    } catch { /* ignore */ }
  }

  return { title, description, favicon, image: absImage, url };
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return Response.json({ error: 'Missing ?url= parameter' }, { status: 400 });
  }

  // Only allow http/https
  if (!/^https?:\/\//i.test(urlParam)) {
    return Response.json({ error: 'Invalid URL scheme' }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(urlParam);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(urlParam, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TiaDesigns-Unfurl/1.0 (compatible; +https://tiadesigns.it)',
        'Accept': 'text/html, application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json(
        { title: '', description: '', favicon: '', image: '', url: urlParam },
        { status: 200 } // Return empty card rather than error
      );
    }

    const html = await res.text();
    const data = parseMeta(html.slice(0, 65536), urlParam); // Only parse first 64KB

    // Cache it (evict oldest if at capacity)
    if (cache.size >= MAX_CACHE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(urlParam, { data, ts: Date.now() });

    return Response.json(data);
  } catch {
    // Timeout, DNS error, etc. — return empty card
    return Response.json(
      { title: '', description: '', favicon: '', image: '', url: urlParam },
      { status: 200 }
    );
  }
}
