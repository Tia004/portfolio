'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';
import { type Lang } from '@/lib/translations';
import BorderGlow from './BorderGlow';
import TiaIcon from './TiaIcon';
import { Globe02Icon } from './icons';

const LANGUAGES: { code: Lang; short: string; label: string }[] = [
  { code: 'it', short: 'IT', label: 'Italiano' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'es', short: 'ES', label: 'Español' },
];

export default function MenuLanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectLang = (code: Lang) => {
    setIsOpen(false);
    if (code === lang) return;

    // Set cookie for 1 year
    const maxAge = 365 * 24 * 60 * 60;
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
    const cookieKey = typeof location !== 'undefined' && location.protocol === 'https:' ? '__Host-lang' : 'lang';
    document.cookie = `${cookieKey}=${code};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
    document.cookie = `lang=${code};path=/;max-age=${maxAge};SameSite=Lax${secure}`;

    // Update state
    setLang(code);

    // Suppress geo banner for this session
    try {
      sessionStorage.setItem('lang-banner-dismissed', '1');
    } catch {
      /* noop */
    }

    // Stay on current page, translating path prefix
    const currentPath = window.location.pathname;
    const withoutLang = currentPath.replace(/^\/(en|es)(?=\/|$)/, '') || '/';
    const targetUrl =
      code === 'it' ? withoutLang : `/${code}${withoutLang === '/' ? '' : withoutLang}`;
    window.location.href = targetUrl;
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div
      ref={containerRef}
      className="relative z-40 select-none pointer-events-auto"
      style={{
        width: 172,
        height: isOpen ? 182 : 46,
        transition: 'height 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <BorderGlow
        borderRadius={24}
        glowRadius={26}
        glowIntensity={1.8}
        edgeSensitivity={0}
        glass={true}
        backgroundColor="rgba(8, 20, 16, 0.70)"
        className="!overflow-hidden rounded-[24px] shadow-xl shadow-black/50 pointer-events-auto cursor-pointer"
        style={{
          width: 172,
          height: isOpen ? 182 : 46,
          transition: 'height 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex flex-col w-full h-full justify-start overflow-hidden pointer-events-auto">
          {/* Header trigger pill — large, reliable hit target */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="flex items-center justify-between w-full h-[46px] px-4 cursor-pointer bg-transparent text-white/90 hover:text-white transition-colors shrink-0 focus:outline-none pointer-events-auto"
          >
            <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
              <TiaIcon icon={Globe02Icon} size={16} className="text-teal-400 shrink-0" strokeWidth={2} />
              <span className="text-xs font-semibold tracking-wide text-white truncate">
                {currentLangObj.label}
              </span>
            </div>

            {/* Rotating chevron */}
            <svg
              aria-hidden="true"
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-300 shrink-0 pointer-events-none ${
                isOpen ? 'rotate-180 text-teal-300' : 'rotate-0'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Elongated list: fills the remaining space evenly with no awkward chin */}
          <div
            className={`flex flex-col p-1.5 gap-1 border-t border-white/[0.08] transition-opacity duration-300 ${
              isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0 overflow-hidden'
            }`}
          >
            {LANGUAGES.map(({ code, short, label }) => {
              const isSelected = code === lang;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectLang(code);
                  }}
                  className={`group flex items-center justify-between h-[38px] px-3 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer pointer-events-auto ${
                    isSelected
                      ? 'bg-teal-500/15 text-teal-300 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 pointer-events-none">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded leading-none transition-colors ${
                        isSelected
                          ? 'bg-teal-400/20 text-teal-300'
                          : 'bg-white/[0.06] text-neutral-400 group-hover:text-neutral-200 group-hover:bg-white/[0.1]'
                      }`}
                    >
                      {short}
                    </span>
                    <span className={`text-xs ${isSelected ? 'font-semibold text-teal-200' : 'font-medium'}`}>
                      {label}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.9)] shrink-0 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </BorderGlow>
    </div>
  );
}
