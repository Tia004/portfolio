import { NextRequest } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { getClientIp, rateLimitResponse, takeChatRateLimit } from '@/lib/chat-security';

export const runtime = 'nodejs';

function isPublicIp(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19)));
  }
  if (kind === 6) {
    const value = address.toLowerCase();
    return !(value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') ||
      value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') ||
      value.startsWith('::ffff:') || value.startsWith('2001:db8:'));
  }
  return false;
}

async function publicWebUrl(raw: string): Promise<URL | null> {
  if (raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80'))) return null;
    const host = url.hostname.toLowerCase();
    if (isIP(host) || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
    const addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) return null;
    return url;
  } catch { return null; }
}

async function readPreviewHtml(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < 65_536) {
      const { done, value } = await reader.read();
      if (done) break;
      const slice = value.subarray(0, 65_536 - size);
      chunks.push(slice);
      size += slice.byteLength;
    }
  } finally { await reader.cancel().catch(() => {}); }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

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

  const ip = getClientIp(req);
  const limit = await takeChatRateLimit(ip, ip, 'unfurl');
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  const url = await publicWebUrl(urlParam);
  if (!url) return Response.json({ error: 'Invalid public URL' }, { status: 400 });

  // Check cache
  const cached = cache.get(urlParam);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    let current = url;
    let res: Response | null = null;
    for (let redirects = 0; redirects <= 2; redirects++) {
      res = await fetch(current, {
        signal: AbortSignal.timeout(5_000),
        headers: { 'User-Agent': 'TiaDesigns-Unfurl/1.0 (compatible; +https://tiadesigns.it)', 'Accept': 'text/html, application/xhtml+xml' },
        redirect: 'manual',
      });
      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get('location');
      if (!location) break;
      const next = await publicWebUrl(new URL(location, current).href);
      if (!next) return Response.json({ error: 'Unsafe redirect' }, { status: 400 });
      current = next;
    }

    if (!res?.ok || !/^text\/html|application\/xhtml\+xml/i.test(res.headers.get('content-type') || '')) {
      return Response.json(
        { title: '', description: '', favicon: '', image: '', url: urlParam },
        { status: 200 } // Return empty card rather than error
      );
    }

    const html = await readPreviewHtml(res);
    const data = parseMeta(html, current.href);

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
