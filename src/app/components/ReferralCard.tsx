'use client';

import { useState, useSyncExternalStore } from 'react';
import BorderGlow from './BorderGlow';
import TiaIcon from './TiaIcon';
import { Discount01Icon, ExternalLinkIcon, WhatsappIcon } from './icons';
import { t, type Lang } from '@/lib/translations';
import { shareLink } from '@/lib/referral';
import { trackClick } from '@/lib/analytics';

// ── Word of mouth, made trackable ─────────────────────────────────────────
// The footer already promised a referral discount; this card is the half that
// was missing: a link anyone can forward. The link carries `?ref=<code>` and
// lib/referral stamps that code onto every analytics event (and lib/analytics
// attaches it centrally), so the dashboard can finally show which shared links
// produced visits and conversions instead of treating word of mouth as
// invisible traffic.
//
// The link is built on the client (it needs the origin) and only after mount,
// so the server and the first client render agree.
// The share link needs the browser origin, so it exists only on the client.
// useSyncExternalStore is the sanctioned way to read such a value without a
// post-mount setState (same pattern the HomeShell uses for media queries):
// the server snapshot is '', the client snapshot is the real link.
const noopSubscribe = () => () => {};
const clientLink = () => shareLink();
const serverLink = () => '';

export default function ReferralCard({ lang }: { lang: Lang }) {
  const link = useSyncExternalStore(noopSubscribe, clientLink, serverLink);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Older browsers / non-secure contexts: fall back to a hidden textarea.
      try {
        const field = document.createElement('textarea');
        field.value = link;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        document.body.removeChild(field);
      } catch {
        /* nothing else to do — the link stays visible for a manual copy */
      }
    }
    setCopied(true);
    trackClick('referral_copy');
    window.setTimeout(() => setCopied(false), 2200);
  };

  const shareWhatsApp = () => {
    if (!link) return;
    const text = t('referral.message', lang).replace('{link}', link);
    trackClick('referral_whatsapp');
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <BorderGlow continuousHover borderRadius={20} glowRadius={24} glowIntensity={2.0} edgeSensitivity={0} className="w-full">
      <div className="p-5 sm:p-6" data-referral="">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
            <TiaIcon icon={Discount01Icon} size={17} className="text-teal-400" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-400">{t('referral.label', lang)}</p>
            <p className="text-sm font-semibold text-white sm:text-base">{t('referral.title', lang)}</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-neutral-400">{t('referral.note', lang)}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <TiaIcon icon={ExternalLinkIcon} size={13} className="shrink-0 text-teal-400/80" strokeWidth={2} />
            <span className="truncate font-mono text-[11px] text-neutral-400">{link || '…'}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!link}
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-teal-500 disabled:opacity-50"
            >
              {copied ? t('referral.copied', lang) : t('referral.copy', lang)}
            </button>
            <button
              type="button"
              onClick={shareWhatsApp}
              disabled={!link}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white transition-all hover:border-teal-400/40 hover:bg-teal-400/[0.10] disabled:opacity-50"
            >
              <TiaIcon icon={WhatsappIcon} size={14} strokeWidth={2} />
              {t('referral.share', lang)}
            </button>
          </div>
        </div>
      </div>
    </BorderGlow>
  );
}
