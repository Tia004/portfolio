'use client';

import { useSyncExternalStore } from 'react';
import BorderGlow from './BorderGlow';
import TiaIcon from './TiaIcon';
import { StaticDitherTexture } from './DitherStatic';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import RetroGame404 from './RetroGame404';
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Home01Icon,
  RefreshIcon,
} from './icons';

// ── 404 / error shell ─────────────────────────────────────────────────────
// One branded surface for the two ways a visitor can end up somewhere that is
// not the site: a URL that does not exist (app/not-found.tsx) and a runtime
// failure (app/error.tsx). Both used to fall through to Next's default white
// page — on a site whose whole argument is craft, the one screen a visitor sees
// when something breaks is the worst possible place to look like a template.
//
// Deliberate constraints:
//   • NO WebGL and no heavy component here. The background is the CSS/SVG
//     StaticDitherTexture that already backs the hero as its instant base: an
//     error page must never depend on the very thing that may have failed.
//     (It is plain DOM + inline SVG, so it survives a broken GPU or a failed
//      three.js chunk.)
//   • No data fetching and no state the server cannot know: the language comes
//     from the provider that the root layout already seeds from the `x-lang`
//     header, so the first paint is final — no flash, no hydration mismatch.
//   • Every link is language-prefixed and points at a REAL section of the home
//     page: a 404 exists to stop being a dead end, not to apologise for one.

interface ErrorShellProps {
  variant: '404' | 'error';
  /** Next's error digest (production only). Shown in mono so it can be quoted. */
  digest?: string;
  /** Retry handler — `reset()` from app/error.tsx. Absent on the 404. */
  onRetry?: () => void;
}

/** Section shortcuts. The labels reuse the nav.* keys on purpose: the chips
 *  here and the navbar can never drift apart, and translating one translates
 *  the other. The hrefs match the real section ids on the home page. */
const noopSubscribe = () => () => {};
const getServerPath = () => '';
const getClientPath = () =>
  typeof window === 'undefined' ? '' : `${window.location.pathname}${window.location.search}`;

const SECTIONS: { href: string; key: string }[] = [
  { href: '#servizi', key: 'nav.servizi' },
  { href: '#prezzi', key: 'nav.prezzi' },
  { href: '#progetti', key: 'nav.progetti' },
  { href: '#chisono', key: 'nav.chisono' },
  { href: '#faq', key: 'nav.faq' },
  { href: '#contatti', key: 'nav.contattami' },
];

export default function ErrorShell({ variant, digest, onRetry }: ErrorShellProps) {
  const { lang } = useLanguage();
  const is404 = variant === '404';

  // The path is client-only state and the shell is server-rendered too, so it
  // is read through useSyncExternalStore — the sanctioned way to expose a
  // browser value with a distinct server snapshot (the server renders '', the
  // client renders the real path) without a post-mount setState and without a
  // hydration mismatch on the one page that must never flicker. Same pattern
  // the media-query reads elsewhere in this codebase use.
  const path = useSyncExternalStore(noopSubscribe, getClientPath, getServerPath);

  const base = lang === 'it' ? '' : `/${lang}`;
  const label = is404 ? t('404.label', lang) : t('error.label', lang);
  const title = is404 ? t('404.title', lang) : t('error.title', lang);
  const text = is404 ? t('404.text', lang) : t('error.text', lang);

  return (
    <main
      className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-5 py-20 sm:px-8"
      // The dither needs a dark base under it on every route: the body colour
      // is set by the layout, but this layer must never sit on white while the
      // CSS is still applying.
      style={{ backgroundColor: '#010101' }}
    >
      {/* ── Dither base ──
          The same masked curtain the hero uses, so the bottom fades into the
          dark instead of ending on a hard edge. Decorative: aria-hidden is on
          the SVG layer itself (see StaticDitherTexture). */}
      <div aria-hidden className="hero-bottom-curtain absolute inset-0 -z-10">
        <StaticDitherTexture />
      </div>
      {/* A single soft teal bloom, centred on the card. The dither alone is
          very dark; this keeps the card from floating on a black hole without
          brightening the whole surface (one radial gradient, no blur pass). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[34rem] max-w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.10), rgba(45,212,191,0) 70%)' }}
      />

      <BorderGlow
        continuousHover
        borderRadius={28}
        glowRadius={44}
        glowIntensity={2.2}
        edgeSensitivity={0}
        className="w-full max-w-3xl"
      >
        <div
          className="px-6 py-10 text-center sm:px-12 sm:py-14"
          data-error-shell={variant}
          // Announcing the failure is the point of the error variant; the 404
          // is a page, not an alert, and gets a plain heading instead.
          role={is404 ? undefined : 'alert'}
        >
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-teal-400/90 sm:text-[13px]">
            {label}
          </p>

          {/* The big numerals: liquid glass gradient-filled text with ambient glow */}
          {is404 && (
            <div className="relative mt-4 flex justify-center items-center">
              {/* Ambient blur glow behind the 404 */}
              <div
                aria-hidden
                className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-teal-500 via-teal-300 to-emerald-400 pointer-events-none -z-10"
              />
              <p
                aria-hidden
                className="select-none font-mono text-[72px] font-black leading-none tracking-tighter sm:text-[112px] drop-shadow-[0_0_24px_rgba(45,212,191,0.35)]"
                style={{
                  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(45,212,191,0.45) 85%, rgba(13,40,31,0.2) 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextStroke: '1px rgba(255,255,255,0.15)',
                }}
              >
                404
              </p>
            </div>
          )}

          <h1 className={`text-2xl font-bold tracking-tight text-white sm:text-4xl ${is404 ? 'mt-5' : 'mt-4'}`}>
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">
            {text}
          </p>

          {/* Retro Pixel Mini-Game on 404 */}
          {is404 && <RetroGame404 />}

          {/* ── Actions ── */}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {!is404 && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-teal-600/25 transition-all hover:bg-teal-500"
              >
                <TiaIcon icon={RefreshIcon} size={16} strokeWidth={2} />
                {t('error.retry', lang)}
              </button>
            )}
            <a
              href={`${base}/`}
              className={
                is404
                  ? 'inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-teal-600/25 transition-all hover:bg-teal-500'
                  : 'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/15'
              }
            >
              <TiaIcon icon={Home01Icon} size={16} strokeWidth={2} />
              {is404 ? t('404.home', lang) : t('error.home', lang)}
            </a>
          </div>

          {/* ── Section shortcuts ── */}
          <div className="mt-9 border-t border-white/[0.08] pt-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {t('404.sections', lang)}
            </p>
            <nav aria-label={t('404.sections', lang)} className="mt-4 flex flex-wrap justify-center gap-2">
              {SECTIONS.map(({ href, key }) => (
                <a
                  key={href}
                  href={`${base}/${href}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-neutral-300 transition-all hover:border-teal-400/45 hover:bg-teal-400/[0.09] hover:text-teal-200"
                >
                  {t(key, lang)}
                  <TiaIcon
                    icon={ArrowRight01Icon}
                    size={12}
                    strokeWidth={2}
                    className="opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </a>
              ))}
            </nav>
          </div>

          {/* ── Diagnostic line ──
              Not decoration: the requested path (404) and the error digest
              (500) are the two things worth quoting when someone reports a
              broken link or a crash. Mono, tiny, machine-copyable. */}
          {(path || digest) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[10px] text-neutral-500">
              {is404 && path && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="uppercase tracking-wider text-neutral-600">{t('404.path', lang)}</span>
                  <span className="break-all text-neutral-400">{path}</span>
                </span>
              )}
              {!is404 && digest && (
                <span className="inline-flex items-center gap-1.5">
                  <TiaIcon icon={AlertCircleIcon} size={11} strokeWidth={2} className="text-teal-400/70" />
                  <span className="uppercase tracking-wider text-neutral-600">{t('error.digest', lang)}</span>
                  <span className="break-all text-neutral-400">{digest}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </BorderGlow>
    </main>
  );
}
