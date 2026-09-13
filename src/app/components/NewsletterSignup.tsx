'use client';

import React, { useCallback, useRef, useState } from 'react';
import { type Lang, t } from '@/lib/translations';
import { getTurnstileToken } from '@/lib/chat-client';
import { SentIcon } from './icons';
import TiaIcon from './TiaIcon';

// ── Public newsletter signup ──────────────────────────────────────────────
// The front door of the double opt-in. Nothing here subscribes anybody: it
// hands the address to /api/newsletter/subscribe, which stores a PENDING row
// and emails the confirmation link. The visitor is told to check their inbox
// and nothing else — the same answer for a new address, an address already
// waiting, and an address already subscribed, so the form cannot be used to
// probe the list.
//
// The consent checkbox is the point of the whole flow, so it is a real
// checkbox with the wording from `newsletter.ts` (the exact same sentence that
// is stored as proof), and it is required — a signup without it is refused by
// the server too, not just hidden by the browser.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function NewsletterSignup({
  lang,
  onOpenLegal,
}: {
  lang: Lang;
  onOpenLegal?: (doc: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const sendingRef = useRef(false);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // A form submitted twice (double Enter on a slow connection) would send
      // two confirmation emails; the server throttles them, but there is no
      // reason to ask.
      if (sendingRef.current) return;

      const address = email.trim();
      if (!EMAIL_PATTERN.test(address)) {
        setStatus('error');
        setMessage(t('newsletter.invalid_email', lang));
        return;
      }
      if (!consent) {
        setStatus('error');
        setMessage(t('newsletter.consent_required', lang));
        return;
      }

      sendingRef.current = true;
      setStatus('sending');
      setMessage('');

      try {
        // Turnstile is best-effort: the endpoint fails open when the widget
        // could not run (adblockers, privacy browsers) and the per-IP rate
        // limit still stands. Waiting on it must never block the signup.
        const captchaToken = await getTurnstileToken().catch(() => '');

        const response = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: address, consent: true, lang, source: 'footer', captchaToken }),
        });

        if (response.status === 429) {
          setStatus('error');
          setMessage(t('newsletter.rate_limited', lang));
          return;
        }

        const data = (await response.json().catch(() => ({}))) as { error?: string; status?: string };

        if (!response.ok) {
          setStatus('error');
          setMessage(
            data.error === 'consent_required'
              ? t('newsletter.consent_required', lang)
              : data.error === 'invalid_email'
                ? t('newsletter.invalid_email', lang)
                : t('newsletter.error', lang),
          );
          return;
        }

        setStatus('done');
        setMessage(t('newsletter.check_email', lang));
        setEmail('');
        setConsent(false);
      } catch {
        setStatus('error');
        setMessage(t('newsletter.error', lang));
      } finally {
        sendingRef.current = false;
      }
    },
    [consent, email, lang],
  );

  const busy = status === 'sending';

  return (
    <section
      aria-labelledby="newsletter-signup-title"
      className="mb-10 sm:mb-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"
    >
      <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,420px)] md:items-start md:gap-8">
        <div>
          <h3 id="newsletter-signup-title" className="text-white text-base sm:text-lg font-medium">
            {t('newsletter.title', lang)}
          </h3>
          <p className="mt-2 text-neutral-400 text-xs leading-relaxed max-w-md">
            {t('newsletter.subtitle', lang)}
          </p>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="newsletter-email">
              {t('newsletter.email_placeholder', lang)}
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== 'idle') { setStatus('idle'); setMessage(''); }
              }}
              placeholder={t('newsletter.email_placeholder', lang)}
              className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-5 py-2.5 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? t('newsletter.sending', lang) : t('newsletter.submit', lang)}
              <TiaIcon icon={SentIcon} size={15} strokeWidth={2} />
            </button>
          </div>

          <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
            <input
              id="newsletter-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (status !== 'idle') { setStatus('idle'); setMessage(''); }
              }}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-teal-400"
            />
            <span className="text-[11px] leading-relaxed text-neutral-400">
              {t('newsletter.consent_prefix', lang)}
              {onOpenLegal ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLegal('privacy');
                  }}
                  className="inline-flex min-h-[28px] py-0.5 items-center text-teal-300 underline underline-offset-2 hover:text-teal-200"
                >
                  {t('newsletter.privacy_link', lang)}
                </button>
              ) : (
                <span className="text-teal-300">{t('newsletter.privacy_link', lang)}</span>
              )}
              {t('newsletter.consent_suffix', lang)}
            </span>
          </label>

          {/* aria-live so the outcome is announced, not just coloured */}
          <p
            role="status"
            aria-live="polite"
            className={`mt-2 min-h-[1.25rem] text-[11px] leading-relaxed ${
              status === 'error' ? 'text-red-300' : 'text-teal-300/90'
            }`}
          >
            {message}
          </p>
        </form>
      </div>
    </section>
  );
}
