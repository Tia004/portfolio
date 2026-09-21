'use client';

import { useSyncExternalStore, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BorderGlow from './BorderGlow';
import TiaIcon from './TiaIcon';
import { StaticDitherTexture } from './DitherStatic';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import RetroGame404 from './RetroGame404';
import Digit404Card from './Digit404Card';
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Home01Icon,
  RefreshIcon,
} from './icons';

const MoltenMetal = dynamic(() => import('./MoltenMetal'), { ssr: false, loading: () => null });

// ── 404 / error shell ─────────────────────────────────────────────────────

interface ErrorShellProps {
  variant: '404' | 'error';
  /** Next's error digest (production only). Shown in mono so it can be quoted. */
  digest?: string;
  /** Retry handler — `reset()` from app/error.tsx. Absent on the 404. */
  onRetry?: () => void;
}

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
  const [gameOpen, setGameOpen] = useState(false);

  const path = useSyncExternalStore(noopSubscribe, getClientPath, getServerPath);

  const base = lang === 'it' ? '' : `/${lang}`;
  const label = is404 ? t('404.label', lang) : t('error.label', lang);
  const title = is404 ? t('404.title', lang) : t('error.title', lang);
  const text = is404 ? t('404.text', lang) : t('error.text', lang);

  // Lock html/body overflow when on 404 so no vertical scrollbar can ever appear
  useEffect(() => {
    if (!is404) return;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, [is404]);

  // ── 404 Screen: Pure Black, Dark Teal MoltenMetal background, zero vertical scroll ──
  if (is404) {
    return (
      <main
        className="fixed inset-0 z-40 flex h-screen max-h-screen w-screen flex-col justify-between items-center overflow-hidden px-4 py-3 sm:py-5 select-none bg-black"
      >
        {/* Molten Metal liquid background — dark and teal matching portfolio theme */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
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
            opacity={0.85}
          />
        </div>

        {/* Top spacer / branding indicator */}
        <div className="w-full flex items-center justify-between max-w-4xl pt-1">
          <a
            href={`${base}/`}
            className="text-xs sm:text-sm font-mono tracking-wider text-white/50 hover:text-white transition-colors"
          >
            ← Tia Designs
          </a>
          <p className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.28em] text-teal-400/90">
            {label}
          </p>
        </div>

        {/* Center: The 3 Clip-Path Digit Cards with BorderGlow & 3D Tilt */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl w-full my-auto px-2">
          {/* Individual Digit Cards: '4', '0', '4' */}
          <div className="relative flex justify-center items-center gap-2.5 sm:gap-6 md:gap-8 my-2 sm:my-3">
            <Digit404Card digit="4" index={0} />
            <Digit404Card digit="0" index={1} />
            <Digit404Card digit="4" index={2} />
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white mt-1 sm:mt-2">
            {title}
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-neutral-400">
            {text}
          </p>

          {/* Action buttons */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            <a
              href={`${base}/`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xl shadow-teal-600/25 transition-all hover:bg-teal-500"
            >
              <TiaIcon icon={Home01Icon} size={15} strokeWidth={2} />
              {t('404.home', lang)}
            </a>
            <button
              type="button"
              onClick={() => setGameOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition-all hover:border-teal-400/40 hover:bg-teal-950/40 hover:text-teal-200 shadow-lg"
            >
              {lang === 'it' ? 'Mini-Gioco Retro' : lang === 'es' ? 'Mini-Juego Retro' : 'Retro Mini-Game'}
            </button>
          </div>

          {/* Section shortcuts */}
          <div className="mt-3 sm:mt-4 pt-2.5 border-t border-white/[0.08] w-full max-w-lg">
            <nav aria-label={t('404.sections', lang)} className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
              {SECTIONS.map(({ href, key }) => (
                <a
                  key={href}
                  href={`${base}/${href}`}
                  className="group inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1 text-[11px] sm:text-xs font-semibold text-neutral-300 transition-all hover:border-teal-400/45 hover:bg-teal-400/[0.09] hover:text-teal-200"
                >
                  {t(key, lang)}
                  <TiaIcon
                    icon={ArrowRight01Icon}
                    size={10}
                    strokeWidth={2}
                    className="opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom diagnostic line */}
        <div className="w-full flex items-center justify-center pb-1">
          {path && (
            <div className="font-mono text-[10px] text-neutral-500 flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-neutral-600">{t('404.path', lang)}</span>
              <span className="break-all text-neutral-400">{path}</span>
            </div>
          )}
        </div>

        {/* Retro Game Modal Overlay */}
        {gameOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setGameOpen(false);
            }}
          >
            <div className="relative max-w-md w-full p-5 rounded-2xl bg-[#081410] border border-white/12 shadow-2xl">
              <button
                onClick={() => setGameOpen(false)}
                className="absolute top-3.5 right-3.5 text-white/60 hover:text-white p-1 rounded-lg text-lg leading-none"
                aria-label="Close game"
              >
                ✕
              </button>
              <div className="pt-2">
                <RetroGame404 />
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ── Generic Error Screen ──
  return (
    <main
      className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-5 py-20 sm:px-8"
      style={{ backgroundColor: '#010101' }}
    >
      <div aria-hidden className="hero-bottom-curtain absolute inset-0 -z-10">
        <StaticDitherTexture />
      </div>
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
          role="alert"
        >
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-teal-400/90 sm:text-[13px]">
            {label}
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl mt-4">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">
            {text}
          </p>

          {/* ── Actions ── */}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {onRetry && (
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
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/15"
            >
              <TiaIcon icon={Home01Icon} size={16} strokeWidth={2} />
              {t('error.home', lang)}
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

          {digest && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[10px] text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <TiaIcon icon={AlertCircleIcon} size={11} strokeWidth={2} className="text-teal-400/70" />
                <span className="uppercase tracking-wider text-neutral-600">{t('error.digest', lang)}</span>
                <span className="break-all text-neutral-400">{digest}</span>
              </span>
            </div>
          )}
        </div>
      </BorderGlow>
    </main>
  );
}

