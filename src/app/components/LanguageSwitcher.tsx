'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

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
  const { lang } = useLanguage();
  const router = useRouter();
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
  }, [open]);  // Clean (mobile hamburger) variant — ultra clean, no borders, no background
  if (isClean) {
    return (
      <div ref={ref} className="relative shrink-0">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="group flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium transition-colors tracking-wide"
        >
          <span className="relative">
            {FULL_NAMES[lang]}
            {/* Custom underline — a thin teal gradient bar with a subtle glow */}
            <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent opacity-50 group-hover:opacity-100 group-hover:h-[1.5px] group-hover:-bottom-[1px] transition-all duration-300" />
          </span>
          {/* Downward chevron */}
          <svg aria-hidden="true" className={`w-3 h-3 text-teal-400/60 group-hover:text-teal-400 transition-all duration-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 flex flex-row gap-2 shrink-0">
            {Object.keys(FULL_NAMES).filter(code => code !== lang).map((code) => (
              <button
                key={code}
                onClick={() => { router.push(code === 'it' ? '/' : `/${code}`, { scroll: false }); setOpen(false); }}
                className="whitespace-nowrap text-sm font-medium transition-colors text-white/50 hover:text-teal-400"
              >
                {FULL_NAMES[code]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop variant (original design with flags, borders, short codes)
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all bg-white/[0.08] backdrop-blur-md border border-white/15 text-white hover:bg-white/14 hover:border-white/25"
      >
        <span className="text-sm leading-none">{lang === 'it' ? '🇮🇹' : lang === 'en' ? '🇬🇧' : '🇪🇸'}</span>
        <span className="font-medium tracking-tight">{SHORT_NAMES[lang]}</span>
        <svg aria-hidden="true" className={`w-3 h-3 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl shadow-black/60 z-50 min-w-[100px]">
          {Object.keys(SHORT_NAMES).filter(code => code !== lang).map((code) => (
            <button
              key={code}
              onClick={() => { router.push(code === 'it' ? '/' : `/${code}`, { scroll: false }); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-white/80 hover:bg-white/[0.08] hover:text-white"
            >
              <span className="text-sm leading-none">{code === 'it' ? '🇮🇹' : code === 'en' ? '🇬🇧' : '🇪🇸'}</span>
              <span className="font-medium">{SHORT_NAMES[code]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
