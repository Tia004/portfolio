'use client';

let sessionPromise: Promise<string> | null = null;
let sessionId = '';
let turnstileWidget: string | number | null = null;
let turnstileToken = '';
let turnstileReady: Promise<void> | null = null;
let turnstileMountPromise: Promise<void> | null = null;
let turnstileWidgetReady: Promise<void> | null = null;

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string | number;
  execute: (widgetId: string | number) => void;
  reset: (widgetId: string | number) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function ensureChatSession(forceNew = false): Promise<string> {
  if (forceNew) {
    sessionId = '';
    sessionPromise = null;
  }
  if (sessionId) return Promise.resolve(sessionId);
  if (sessionPromise) return sessionPromise;
  sessionPromise = fetch('/api/chat/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  }).then(async (response) => {
    if (!response.ok) throw new Error('chat-session-failed');
    const data = await response.json() as { sessionId?: string };
    if (!data.sessionId) throw new Error('chat-session-missing');
    sessionId = data.sessionId;
    return sessionId;
  }).catch((error) => {
    sessionPromise = null;
    throw error;
  });
  return sessionPromise;
}

export function resetChatSession(): void {
  sessionId = '';
  sessionPromise = null;
}

export function getChatSessionId(): string {
  return sessionId;
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileReady) return turnstileReady;
  turnstileReady = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('turnstile-script-failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile-script-failed'));
    document.head.appendChild(script);
  });
  return turnstileReady;
}

export async function mountTurnstile(container: HTMLElement, siteKey: string): Promise<() => void> {
  if (!siteKey) return () => undefined;

  // Publish the mount promise before the first await. A visitor can click the
  // chat immediately after paint, so protected requests must be able to wait
  // for Turnstile instead of racing the loading effect in HomeShell.
  let resolveWidgetReady: (() => void) | null = null;
  turnstileWidgetReady = new Promise<void>((resolve) => { resolveWidgetReady = resolve; });
  turnstileMountPromise = (async () => {
    await loadTurnstileScript();
    if (!window.turnstile) throw new Error('turnstile-unavailable');
    turnstileWidget = window.turnstile.render(container, {
      sitekey: siteKey,
    size: 'invisible',
    action: 'turnstile-spin-v2',
    callback: (token: unknown) => {
        turnstileToken = typeof token === 'string' ? token : '';
        resolveWidgetReady?.();
      },
      'expired-callback': () => { turnstileToken = ''; },
      'error-callback': () => { turnstileToken = ''; resolveWidgetReady?.(); },
    });
    // Rendering is synchronous in Turnstile's explicit API, but resolving on
    // the next microtask also covers browsers that attach the widget asynchronously.
    queueMicrotask(() => resolveWidgetReady?.());
  })();

  try {
    await turnstileMountPromise;
  } catch (error) {
    turnstileMountPromise = null;
    throw error;
  }

  return () => {
    turnstileToken = '';
    container.replaceChildren();
    turnstileWidget = null;
    turnstileMountPromise = null;
    turnstileWidgetReady = null;
  };
}

export async function getTurnstileToken(): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    // Turnstile not configured — return empty token. The server-side
    // verifyTurnstile will handle the missing token gracefully instead
    // of crashing the frontend fetch chain.
    return '';
  }
  if (!window.turnstile || turnstileWidget === null) {
    // The first click can happen in the small gap before React runs the mount
    // effect. Wait briefly for that promise instead of failing a legitimate
    // first message.
    const startedWaiting = Date.now();
    while (!turnstileMountPromise && Date.now() - startedWaiting < 2_000) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    if (turnstileMountPromise) await turnstileMountPromise;
    if (turnstileWidgetReady) await turnstileWidgetReady;
    // Never throw — a missing widget is not the user's fault (adblockers,
    // slow networks, script failures). Return empty so the server can
    // respond with a proper HTTP error instead of a broken fetch chain.
    if (!window.turnstile || turnstileWidget === null) return '';
  }
  turnstileToken = '';
  // Turnstile tokens are single-use; reset before every protected request.
  window.turnstile.reset(turnstileWidget!);
  window.turnstile.execute(turnstileWidget!);
  const started = Date.now();
  while (!turnstileToken && Date.now() - started < 8_000) {
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  // Never throw — timeout returns empty so the server handles it gracefully.
  if (!turnstileToken) return '';
  return turnstileToken;
}

export async function getChatRequestContext(forceNew = false): Promise<{ sessionId: string; captchaToken: string }> {
  const currentSessionId = await ensureChatSession(forceNew);
  const captchaToken = await getTurnstileToken();
  return { sessionId: currentSessionId, captchaToken };
}

/** Add the server-issued session and one-shot CAPTCHA token to JSON requests.
 * If an old cookie/session pair expired, retry once with a fresh session. */
export async function secureChatFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = async (forceNew: boolean) => {
    const { sessionId: currentSessionId, captchaToken } = await getChatRequestContext(forceNew);
    let payload: Record<string, unknown> = {};
    if (typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed;
      } catch {
        // Protected chat requests are JSON-only; keep an empty payload on malformed input.
      }
    }
    return fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      body: JSON.stringify({ ...payload, sessionId: currentSessionId, captchaToken }),
    });
  };

  let response = await send(false);
  if (response.status === 401) response = await send(true);
  return response;
}
