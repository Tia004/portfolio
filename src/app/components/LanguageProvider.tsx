'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Lang, DEFAULT_LANG, LANGS, countryToLang, t } from '@/lib/translations';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LanguageCtx>({ lang: DEFAULT_LANG, setLang: () => {} });

export function useLanguage() {
  return useContext(Ctx);
}

/** Returns the cookie name: __Host-lang on HTTPS (production), lang on HTTP (dev).
 *  The __Host- prefix enforces Secure + path=/ + no Domain — stricter security. */
function getCookieKey(): string {
  return location.protocol === 'https:' ? '__Host-lang' : 'lang';
}

function setLangCookie(l: Lang) {
  if (typeof document === 'undefined') return;
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  const secure = location.protocol === 'https:' ? ';Secure' : '';
  const key = getCookieKey();
  document.cookie = `${key}=${l};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

function getLangCookie(): Lang | null {
  if (typeof document === 'undefined') return null;
  // Try both names: __Host-lang (production) and lang (development / legacy)
  for (const key of ['__Host-lang', 'lang']) {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
    const val = match?.[1] as Lang | undefined;
    if (val && LANGS.some(l => l.code === val)) return val;
  }
  return null;
}

function popupTitle(lang: Lang, country: string): string {
  if (lang === 'it') return `Sembra che tu sia in ${country}.`;
  if (lang === 'es') return `Parece que estás en ${country}.`;
  return `It looks like you're in ${country}.`;
}

function popupQuestion(lang: Lang): string {
  if (lang === 'it') return 'Vuoi cambiare lingua?';
  if (lang === 'es') return '¿Quieres cambiar de idioma?';
  return 'Would you like to switch languages?';
}

export default function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang || DEFAULT_LANG);
  const [showPopup, setShowPopup] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState('');
  const [detectedLang, setDetectedLang] = useState<Lang | null>(null);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLangCookie(l);
    setShowPopup(false);
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    // If the server already provided the language (via middleware cookie → x-lang header),
    // skip geo-detection entirely — cookie already matches.
    if (initialLang) {
      return;
    }

    // 1. Cookie (survives refresh, server-readable via middleware)
    const cookieLang = getLangCookie();
    if (cookieLang) {
      setLangState(cookieLang);
      document.documentElement.lang = cookieLang;
      return;
    }

    // 2. Geo-detection as final fallback
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((data: { country_code?: string; country_name?: string }) => {
        if (!data?.country_code) return;
        const detected = countryToLang(data.country_code);
        const countryName = data.country_name || data.country_code;

        if (detected !== DEFAULT_LANG) {
          setDetectedCountry(countryName);
          setDetectedLang(detected);
          setShowPopup(true);
        } else {
          setLangState(detected);
          document.documentElement.lang = detected;
        }
      })
      .catch(() => {});
  }, []);

  const handleKeep = () => {
    setLang(lang);
    setShowPopup(false);
  };

  const handleSwitch = () => {
    if (detectedLang) setLang(detectedLang);
  };

  const popupLang = detectedLang || 'en';
  const currentName = lang === 'it' ? 'Italiano' : lang === 'en' ? 'English' : 'Español';
  const detectedName = detectedLang === 'it' ? 'Italiano' : detectedLang === 'en' ? 'English' : detectedLang === 'es' ? 'Español' : 'English';

  return (
    <Ctx.Provider value={{ lang, setLang }}>
      {children}

      {showPopup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] bg-[#121212]/95 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 shadow-2xl shadow-black/60 max-w-sm w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <p className="text-white text-sm font-medium mb-1">
            {popupTitle(popupLang, detectedCountry)}
          </p>
          <p className="text-neutral-400 text-xs mb-4">
            {popupQuestion(popupLang)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleKeep}
              className="flex-1 py-2 rounded-xl text-xs font-medium border border-white/10 text-white/70 hover:bg-white/[0.06] transition-all"
            >
              {popupLang === 'it' ? 'Resta in' : popupLang === 'es' ? 'Quedarse en' : 'Stay in'} {currentName}
            </button>
            <button
              onClick={handleSwitch}
              className="flex-1 py-2 rounded-xl text-xs font-medium bg-teal-600 text-white hover:bg-teal-500 transition-all"
            >
              {popupLang === 'it' ? 'Passa a' : popupLang === 'es' ? 'Cambiar a' : 'Switch to'} {detectedName}
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
