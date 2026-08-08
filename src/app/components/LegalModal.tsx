'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LegalDoc } from '@/lib/legal-content';
import { useSectionNav } from '@/app/hooks/useSectionNav';
import { useLanguage } from './LanguageProvider';
import { useLenis } from './SmoothScroll';
import { t } from '@/lib/translations';

interface LegalModalProps {
  doc: LegalDoc;
  onClose: () => void;
}

export default function LegalModal({ doc, onClose }: LegalModalProps) {
  const { lang } = useLanguage();
  const { lenis } = useLenis();

  const {
    contentRef,
    registerSection,
    activeSection: activeIndex,
    scrollToSection,
  } = useSectionNav({
    rootMargin: '-80px 0px -40% 0px',
    threshold: [0, 0.25, 0.5, 0.75, 1],
    deps: [doc],
    scrollOffset: 16,
  });

  // Lock body scroll + stop Lenis entirely so native wheel events reach the modal content
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overscrollBehavior = 'none';

    // Stop Lenis — this guarantees wheel events are NOT intercepted, allowing
    // native scroll on the content div inside the modal.
    lenis.current?.stop();

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overscrollBehavior = '';
      window.scrollTo(0, scrollY);

      // Restart Lenis when modal closes
      lenis.current?.start();
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const cb = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [onClose]);

  // Focus trap: focus the content container on mount
  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        ref={contentRef}
        tabIndex={-1}
        className="relative w-full max-w-4xl max-h-[85vh] bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col outline-none"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.05] backdrop-blur-xl">
          <div>
            <h2 className="text-white text-lg font-semibold tracking-tight">{doc.title}</h2>
            <p className="text-neutral-500 text-xs mt-0.5">{t('legal.updated', lang)}: {doc.lastUpdated}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
            aria-label={t('legal.close', lang)}
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Table of Contents sidebar ── */}
          <nav
            className="hidden sm:flex flex-col shrink-0 w-48 lg:w-56 border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-3 gap-1 overflow-y-auto"
            aria-label={t('legal.toc', lang)}
          >
            {doc.sections.map((s, i) => (
              <button
                key={i}
                onClick={() => scrollToSection(i)}
                className={`group flex items-start gap-2.5 text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                  activeIndex === i
                    ? 'bg-teal-500/10 text-teal-400'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]'
                }`}
              >
                {/* Dot indicator */}
                <span
                  className={`mt-1 shrink-0 w-2 h-2 rounded-full transition-all duration-300 ${
                    activeIndex === i
                      ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]'
                      : 'bg-neutral-600 group-hover:bg-neutral-400'
                  }`}
                />
                {/* Heading text */}
                <span className="text-xs leading-relaxed line-clamp-2">
                  {s.heading}
                </span>
              </button>
            ))}
          </nav>

          {/* Content — scrollable (data-lenis-prevent tells Lenis to skip preventDefault on wheel events) */}
          <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-8 scroll-smooth min-h-0">
            {doc.sections.map((s, i) => (
              <section
                key={i}
                ref={registerSection(i)}
                data-section={i}
                id={`legal-section-${i}`}
              >
                <h3 className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  {s.heading}
                </h3>
                <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-line">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Footer bar */}
        <div className="shrink-0 px-6 py-3 border-t border-white/[0.06] bg-white/[0.05] backdrop-blur-xl flex items-center justify-between">
          <p className="text-neutral-600 text-xs">Tia Designs — {doc.lastUpdated}</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium bg-teal-600 text-white hover:bg-teal-500 transition-all"
          >
            {t('legal.understood', lang)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
