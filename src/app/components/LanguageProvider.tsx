'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type Lang, DEFAULT_LANG, LANGS, countryToLang, t } from '@/lib/translations';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LanguageCtx>({ lang: DEFAULT_LANG, setLang: () => {} });

export function useLanguage() {
  return useContext(Ctx);
}

const FULL_NAMES: Record<string, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};

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

/** The visitor dismissed the banner for this session (X, or confirmed the
 *  suggestion) — don't nag again until the next session. */
function rememberDismissal() {
  try { sessionStorage.setItem('lang-banner-dismissed', '1'); } catch { /* noop */ }
}
function wasDismissed(): boolean {
  try { return sessionStorage.getItem('lang-banner-dismissed') === '1'; } catch { return false; }
}

export default function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang || DEFAULT_LANG);
  const [showBanner, setShowBanner] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Lang>(initialLang || DEFAULT_LANG);
  const [detectedCountry, setDetectedCountry] = useState('');
  const bannerRef = useRef<HTMLDivElement>(null);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLangCookie(l);
    document.documentElement.lang = l;
  }, []);

  // Publish the banner height as a CSS variable so the fixed navbar and the
  // hero slide down with it (Apple-style: the banner "pushes" the page).
  useEffect(() => {
    const root = document.documentElement;
    if (showBanner) {
      const measure = () => {
        const h = bannerRef.current?.getBoundingClientRect().height ?? 0;
        root.style.setProperty('--lang-banner-h', `${h}px`);
      };
      measure();
      const ro = new ResizeObserver(measure);
      if (bannerRef.current) ro.observe(bannerRef.current);
      return () => ro.disconnect();
    }
    root.style.setProperty('--lang-banner-h', '0px');
  }, [showBanner]);

  // Geo-detection (Apple-style): the proxy sets a default lang cookie on every
  // visit, so it can't be used to suppress the banner. Instead: if the visitor
  // is NOT in Italy and the suggested language differs from the one in use,
  // show the banner (unless dismissed this session).
  useEffect(() => {
    if (wasDismissed()) return;

    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((data: { country_code?: string; country_name?: string }) => {
        // QA hook: ?geo=US forces the banner regardless of the real IP,
        // so the flow can be tested without a VPN (geo is IP-based).
        const override = new URLSearchParams(window.location.search).get('geo');
        const code = override || data?.country_code;
        if (!code) return;
        const detected = countryToLang(code);
        // Only suggest outside Italy, and only when it differs from the
        // language currently in use.
        if (detected === DEFAULT_LANG || detected === (initialLang || DEFAULT_LANG)) return;
        const countryName = data.country_name || code;
        setDetectedCountry(override ? code : countryName);
        setSelectedLang(detected);
        setShowBanner(true);
      })
      .catch(() => {});
  }, [initialLang]);

  const closeBanner = () => {
    setLeaving(true);
    setBannerOpen(false);
    window.setTimeout(() => {
      setShowBanner(false);
      setLeaving(false);
    }, 450);
  };

  const handleDismiss = () => {
    rememberDismissal();
    closeBanner();
  };

  const handleContinue = () => {
    rememberDismissal();
    if (selectedLang !== lang) {
      setLang(selectedLang);
      const targetUrl = selectedLang === 'it' ? '/' : `/${selectedLang}`;
      window.location.href = targetUrl;
      return;
    }
    closeBanner();
  };

  const bannerText = t('lang.banner_text', lang).replace('{country}', detectedCountry);

  return (
    <Ctx.Provider value={{ lang, setLang }}>
      {children}

      {/* ── Apple-style language banner ── */}
      {/* Pushes the fixed navbar + hero down by --lang-banner-h. z-[10001]:
          above the docked mobile CTA (z-[10000]) but below the fullscreen menu
          (also z-[10001], later in the DOM → wins) and every modal. */}
      {(showBanner || leaving) && (
        <div
          ref={bannerRef}
          className={`fixed top-0 left-0 right-0 z-[10001] ${leaving ? 'pointer-events-none' : ''}`}
        >
          <div
            className={`bg-[#0c1111]/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/40 transition-all duration-400 ${
              leaving ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-8 py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-4 flex-wrap sm:flex-nowrap">
              <p className="text-[11px] sm:text-[13px] text-white/70 leading-snug flex-1 min-w-[180px] sm:min-w-0">
                {bannerText}
              </p>

              {/* Language rectangle — checkmark + current selection + chevron */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setBannerOpen(!bannerOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={bannerOpen}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.08] border border-white/15 px-3 py-1.5 text-[12px] sm:text-[13px] font-medium text-white hover:bg-white/[0.12] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span className="whitespace-nowrap">{FULL_NAMES[selectedLang]}</span>
                  <svg className={`w-3 h-3 text-white/50 transition-transform duration-200 ${bannerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {bannerOpen && (
                  <div className="absolute top-full mt-1.5 right-0 min-w-[150px] bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl shadow-black/60 z-50">
                    {LANGS.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setSelectedLang(l.code)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors text-white/80 hover:bg-white/[0.08] hover:text-white"
                      >
                        {selectedLang === l.code && (
                          <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                        <span className={selectedLang === l.code ? '' : 'pl-6'}>{FULL_NAMES[l.code]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleContinue}
                className="shrink-0 rounded-lg bg-teal-500 hover:bg-teal-400 text-white px-3.5 sm:px-4 py-1.5 text-[12px] sm:text-[13px] font-semibold transition-colors"
              >
                {t('lang.banner_continue', lang)}
              </button>
              <button
                onClick={handleDismiss}
                aria-label={t('lang.banner_close', lang)}
                className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
