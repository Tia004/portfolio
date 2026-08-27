'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';
import { type Lang } from '@/lib/translations';

const FULL_NAMES: Record<string, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};

const SHORT_NAMES: Record<string, string> = {
  it: 'IT',
  en: 'EN',
  es: 'ES',
};

export default function LanguageSwitcher({ variant }: { variant?: 'desktop' | 'clean' }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isClean = variant === 'clean';

  useEffect(() => {
    if (!open) return;
    const cb = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', cb);
    return () => document.removeEventListener('mousedown', cb);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const cb = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [open]);

  const handleSelectLang = (code: string) => {
    setOpen(false);
    if (code === lang) return;

    // Set cookie for 1 year
    const maxAge = 365 * 24 * 60 * 60;
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
    const cookieKey = typeof location !== 'undefined' && location.protocol === 'https:' ? '__Host-lang' : 'lang';
    document.cookie = `${cookieKey}=${code};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
    document.cookie = `lang=${code};path=/;max-age=${maxAge};SameSite=Lax${secure}`;

    // Update state
    setLang(code as Lang);

    // Suppress geo banner for this session
    try { sessionStorage.setItem('lang-banner-dismissed', '1'); } catch { /* noop */ }

    // Navigate to clean route starting from Hero
    const targetUrl = code === 'it' ? '/' : `/${code}`;
    window.location.href = targetUrl;
  };

  // Clean variant (mobile hamburger & footer)
  if (isClean) {
    return (
      <div ref={ref} className="relative shrink-0">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="group flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors tracking-wide cursor-pointer"
        >
          <span className="relative">
            {FULL_NAMES[lang] || 'Italiano'}
            <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent opacity-50 group-hover:opacity-100 group-hover:h-[1.5px] group-hover:-bottom-[1px] transition-all duration-300" />
          </span>
          <svg aria-hidden="true" className={`w-3.5 h-3.5 text-teal-400/60 group-hover:text-teal-400 transition-all duration-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute bottom-full mb-2 left-0 sm:bottom-auto sm:top-full sm:mt-2 z-50 flex flex-col items-start gap-1 p-2 bg-[#0c1412]/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-2xl shadow-black/80 min-w-[120px]">
            {Object.keys(FULL_NAMES).map((code) => (
              <button
                key={code}
                onClick={() => handleSelectLang(code)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  code === lang
                    ? 'text-teal-300 bg-teal-500/15 font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {FULL_NAMES[code]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop variant (flags & badges)
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all bg-white/[0.08] backdrop-blur-md border border-white/15 text-white hover:bg-white/14 hover:border-white/25 cursor-pointer"
      >
        <span className="text-sm leading-none">{lang === 'it' ? '🇮🇹' : lang === 'en' ? '🇬🇧' : '🇪🇸'}</span>
        <span className="font-medium tracking-tight">{SHORT_NAMES[lang] || 'IT'}</span>
        <svg aria-hidden="true" className={`w-3 h-3 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-[#0c1412]/95 backdrop-blur-xl border border-teal-500/20 rounded-xl p-1 shadow-2xl shadow-black/80 z-50 min-w-[120px]">
          {Object.keys(SHORT_NAMES).map((code) => (
            <button
              key={code}
              onClick={() => handleSelectLang(code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                code === lang
                  ? 'text-teal-300 bg-teal-500/15 font-semibold'
                  : 'text-white/80 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span className="text-sm leading-none">{code === 'it' ? '🇮🇹' : code === 'en' ? '🇬🇧' : '🇪🇸'}</span>
              <span className="font-medium">{SHORT_NAMES[code]}</span>
              {code === lang && <span className="ml-auto text-teal-400 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
