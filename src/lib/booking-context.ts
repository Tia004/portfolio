'use client';

// ── Visitor context for the booking / handoff prefill ─────────────────────
// The chatbot already collects the qualification data (service, budget,
// timeline, a first draft of the brief). This module is the single place that
// keeps it, so two consumers can reuse it instead of asking the visitor the
// same questions again:
//
//   • the Cal.com embed (CallEmbedHost) → prefills name / email / notes so the
//     call starts from the substance instead of a blank form;
//   • the Telegram handoff (the chat already forwards messages server-side) →
//     the brief travels with the lead.
//
// sessionStorage, not localStorage: this is one visit's conversation, and it
// must not resurrect on a later visit as stale qualification data.

const STORAGE_KEY = 'tia-visitor-context';

export interface VisitorContext {
  name?: string;
  email?: string;
  /** Service as the contact pipeline expects it (see normalizeContactService). */
  service?: string;
  /** Sub-category chosen in the chat (e.g. "E-commerce"). */
  type?: string;
  budget?: number | string;
  pages?: string;
  delivery?: string;
  /** Free-text brief: the quote draft, the contact-form message, … */
  notes?: string;
  /** Where this context came from: 'ai_quote' | 'contact_form' | 'chat'. */
  source?: string;
}

let cache: VisitorContext | null = null;

/** Read the stored context (module cache first, then sessionStorage). */
export function getVisitorContext(): VisitorContext | null {
  if (cache) return cache;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorContext;
    if (!parsed || typeof parsed !== 'object') return null;
    cache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Merge new data into the stored context. Empty/undefined fields never
 * overwrite a value that is already known, so a later partial update (the
 * visitor only typed their email) cannot erase the earlier brief.
 */
export function setVisitorContext(patch: VisitorContext): void {
  if (typeof window === 'undefined') return;
  const current = getVisitorContext() ?? {};
  const next: VisitorContext = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    (next as Record<string, unknown>)[key] = value;
  }
  cache = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — the in-memory cache still serves this page */
  }
}

/** Forget the context (used when the visitor explicitly resets the chat). */
export function clearVisitorContext(): void {
  cache = null;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Bare query parameters for a Cal.com booking link
 * (`name=…&email=…&notes=…`), WITHOUT a leading `?`/`&` — callers own the
 * separator because a booking link may or may not already carry a query
 * string. Returns '' when nothing is known, so it can be concatenated
 * conditionally. Values are length-capped: booking URLs end up in the address
 * bar and a pasted brief can be long.
 */
export function bookingPrefillQuery(lang?: string): string {
  const ctx = getVisitorContext();
  if (!ctx) return '';
  const params = new URLSearchParams();
  if (ctx.name) params.set('name', ctx.name.slice(0, 80));
  if (ctx.email) params.set('email', ctx.email.slice(0, 120));

  const notes: string[] = [];
  if (ctx.service) notes.push(lang === 'en' ? `Service: ${ctx.service}` : lang === 'es' ? `Servicio: ${ctx.service}` : `Servizio: ${ctx.service}`);
  if (ctx.type) notes.push(lang === 'en' ? `Type: ${ctx.type}` : lang === 'es' ? `Tipo: ${ctx.type}` : `Tipo: ${ctx.type}`);
  if (ctx.budget !== undefined && ctx.budget !== '') notes.push(lang === 'en' ? `Budget: ${ctx.budget}` : lang === 'es' ? `Presupuesto: ${ctx.budget}` : `Budget: ${ctx.budget}`);
  if (ctx.pages) notes.push(lang === 'en' ? `Pages: ${ctx.pages}` : lang === 'es' ? `Páginas: ${ctx.pages}` : `Pagine: ${ctx.pages}`);
  if (ctx.delivery) notes.push(lang === 'en' ? `Timeline: ${ctx.delivery}` : lang === 'es' ? `Plazo: ${ctx.delivery}` : `Tempistiche: ${ctx.delivery}`);
  if (ctx.notes) notes.push(ctx.notes);
  if (notes.length) params.set('notes', notes.join('\n').slice(0, 900));

  return params.toString();
}
