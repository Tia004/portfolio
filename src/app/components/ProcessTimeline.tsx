'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';

interface TimelineStep {
  number: number;
  titleKey: string;
  descKey: string;
}

const STEPS: TimelineStep[] = [
  { number: 1, titleKey: 'processo.step1_title', descKey: 'processo.step1_desc' },
  { number: 2, titleKey: 'processo.step2_title', descKey: 'processo.step2_desc' },
  { number: 3, titleKey: 'processo.step3_title', descKey: 'processo.step3_desc' },
  { number: 4, titleKey: 'processo.step4_title', descKey: 'processo.step4_desc' },
  { number: 5, titleKey: 'processo.step5_title', descKey: 'processo.step5_desc' },
  { number: 6, titleKey: 'processo.step6_title', descKey: 'processo.step6_desc' },
];

export default function ProcessTimeline() {
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [lineProgress, setLineProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const line = lineRef.current;
    if (!container || !line) return;

    const onScroll = () => {
      const rect = container.getBoundingClientRect();
      const totalHeight = container.scrollHeight;
      const visibleTop = -rect.top;
      const visibleBottom = visibleTop + window.innerHeight;

      // How much of the container is visible (with generous margins)
      const effectiveTop = Math.max(0, visibleTop - window.innerHeight * 0.3);
      const effectiveBottom = Math.min(totalHeight, visibleBottom + window.innerHeight * 0.2);
      const visibleRange = effectiveBottom - effectiveTop;
      const totalRange = totalHeight * 0.85; // the line doesn't reach the very bottom
      const progress = Math.min(1, Math.max(0, visibleRange / totalRange));
      setLineProgress(progress);

      // Which step is in the center of the viewport
      const viewportCenter = window.innerHeight / 2;
      let bestStep = 0;
      let bestDist = Infinity;

      const stepEls = container.querySelectorAll('.timeline-step');
      stepEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestStep = i;
        }
      });
      setActiveStep(bestStep);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-5xl mx-auto py-12 sm:py-20">
      {/* ── SVG Line (drawn with scroll) ── */}
      <svg
        className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px pointer-events-none"
        style={{
          width: 'calc(100% - 48px)',
          left: '24px',
        }}
        preserveAspectRatio="none"
        viewBox="0 0 2 900"
      >
        <defs>
          <linearGradient id="timeline-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.2" />
            <stop offset={`${lineProgress * 100}%`} stopColor="#2dd4bf" stopOpacity="1" />
            <stop offset={`${lineProgress * 100}%`} stopColor="#2dd4bf" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="2" height="900" rx="1" fill="url(#timeline-grad)" />
      </svg>

      {/* For mobile: line on left */}
      <div
        className="sm:hidden absolute left-8 top-0 bottom-0 w-px pointer-events-none z-0"
        style={{
          background: `linear-gradient(to bottom, rgba(45,212,191,${0.2 + lineProgress * 0.8}) 0%, rgba(45,212,191,${0.2 + lineProgress * 0.8}) ${lineProgress * 100}%, rgba(45,212,191,0.1) ${lineProgress * 100}%, rgba(45,212,191,0.1) 100%)`,
        }}
      />

      {/* ── Steps ── */}
      <div className="relative z-10">
        {STEPS.map((step, i) => {
          const isLeft = i % 2 === 0;
          const isActive = i === activeStep;
          const title = t(step.titleKey, lang);
          const desc = t(step.descKey, lang);

          return (
            <div
              key={i}
              className={`timeline-step relative mb-16 sm:mb-24 last:mb-0 ${
                isLeft ? 'sm:text-right' : 'sm:text-left'
              } ${isActive ? 'opacity-100' : 'opacity-50'} transition-opacity duration-500`}
            >
              {/* ── Number + Connector (always centered on the timeline) ── */}
              <div className="flex items-center gap-6 sm:gap-0">
                {/* Mobile: number before content */}
                <div className="sm:hidden shrink-0 z-10">
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/40 scale-110'
                        : 'bg-white/5 border-white/15 text-teal-400'
                    }`}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Content card */}
                <div
                  className={`flex-1 sm:w-[calc(50%-32px)] sm:${isLeft ? 'mr-auto pr-0' : 'ml-auto pl-0'} ${
                    isLeft ? 'sm:text-right sm:mr-auto sm:pr-0' : 'sm:text-left sm:ml-auto sm:pl-0'
                  }`}
                  style={{
                    maxWidth: 'calc(50% - 48px)',
                    ...(isLeft ? { marginRight: 'auto' } : { marginLeft: 'auto' }),
                  }}
                >
                  <div
                    className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? 'bg-white/[0.06] border-teal-400/30 shadow-[0_0_30px_rgba(45,212,191,0.1)]'
                        : 'bg-white/[0.03] border-white/[0.06]'
                    }`}
                    style={{
                      backgroundImage: isActive
                        ? 'linear-gradient(135deg, rgba(45,212,191,0.06), rgba(45,212,191,0.01))'
                        : undefined,
                    }}
                  >
                    <h3
                      className={`text-lg sm:text-xl font-bold mb-2 ${
                        isActive ? 'text-teal-300' : 'text-white'
                      } transition-colors duration-300`}
                    >
                      {title}
                    </h3>
                    <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">{desc}</p>
                  </div>
                </div>

                {/* Desktop: number in center */}
                <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 z-10">
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/40 scale-110'
                        : 'bg-white/5 border-white/15 text-teal-400'
                    }`}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Spacer for the other side */}
                <div
                  className={`hidden sm:block ${
                    isLeft ? 'order-last' : 'order-first'
                  }`}
                  style={{ width: 'calc(50% - 48px)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}