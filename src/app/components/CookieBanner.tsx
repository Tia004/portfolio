'use client';

import { useState, useEffect, useRef } from 'react';
import TiaIcon from './TiaIcon';
import { Settings01Icon } from './icons';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import { setConsent, hasConsent, type ConsentLevel } from '@/lib/cookie-consent';
import { trackPageView, trackCookieConsent } from '@/lib/analytics';

export default function CookieBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const scrollPosRef = useRef(0);

  // Non-blocking banner — users can freely browse and scroll the page
  // while the floating consent banner remains accessible at the bottom.

  // Allow reopening via global event (from footer link or other triggers)
  useEffect(() => {
    const cb = () => { setVisible(true); setExiting(false); };
    window.addEventListener('open-cookie-settings', cb);
    return () => window.removeEventListener('open-cookie-settings', cb);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasConsent()) setVisible(true);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const handleAccept = (level: ConsentLevel) => {
    const isFirstConsent = !hasConsent();
    setConsent(level);
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 300);
    if (isFirstConsent) trackCookieConsent([level]);
    if (level === 'all') trackPageView();
  };

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:p-6 pointer-events-none ${exiting ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-none pointer-events-none" />

      {/* Card */}
      <div className={`relative w-full max-w-lg pointer-events-auto ${exiting ? 'animate-out slide-out-to-bottom-4 fade-out duration-300' : 'animate-in slide-in-from-bottom-4 fade-in duration-500'}`}>
        {/* Outer glow ring */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-teal-500/20 via-white/[0.06] to-teal-500/10 blur-sm -z-10" />

        <div className="relative rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.08] p-6 sm:p-7 shadow-2xl shadow-black/50">
          {/* Top decorative line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />

          {/* Cookie icon */}
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <TiaIcon icon={Settings01Icon} size={20} className="text-teal-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-white text-base font-semibold tracking-tight">
              {t('cookie.title', lang)}
            </h3>
          </div>

          {/* Description */}
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            {t('cookie.desc', lang)}{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: 'cookies' }))}
              className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
            >
              {t('cookie.learn_more', lang)}
            </button>
            .
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => handleAccept('all')}
              className="flex-1 px-5 py-3 rounded-2xl text-sm font-semibold bg-teal-600/90 text-white
                         hover:bg-teal-500/90 transition-all duration-200
                         shadow-lg shadow-teal-500/15 hover:shadow-teal-500/25
                         border border-teal-400/20"
            >
              {t('cookie.accept_all', lang)}
            </button>
            <button
              onClick={() => handleAccept('technical')}
              className="flex-1 px-5 py-3 rounded-2xl text-sm font-medium
                         bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white
                         border border-white/[0.08] hover:border-white/[0.12]
                         transition-all duration-200"
            >
              {t('cookie.necessary', lang)}
            </button>
          </div>

          {/* Bottom subtle text */}
          <p className="mt-4 text-center text-white/20 text-[11px]">
            {t('cookie.saved', lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
