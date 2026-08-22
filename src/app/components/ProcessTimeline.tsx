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
  const [lineProgress, setLineProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const rect = container.getBoundingClientRect();
      const totalHeight = container.scrollHeight;

      // Track which step is closest to viewport center
      const viewportCenter = window.innerHeight / 2;
      let bestStep = 0;
      let bestDist = Infinity;
      const stepEls = container.querySelectorAll('.timeline-step');
      stepEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) { bestDist = dist; bestStep = i; }
      });
      setActiveStep(bestStep);

      // Line progress: how much of the container has passed the viewport center
      const progress = Math.min(1, Math.max(0,
        (window.innerHeight / 2 - rect.top) / (totalHeight * 0.85)
      ));
      setLineProgress(progress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-5xl mx-auto py-8 sm:py-16">
      {/* ── Center SVG Line (desktop only) ── */}
      <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 -translate-x-px pointer-events-none z-0" style={{ width: '2px' }}>
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `linear-gradient(to bottom,
              rgba(45,212,191,0.9) 0%,
              rgba(45,212,191,0.9) ${lineProgress * 100}%,
              rgba(45,212,191,0.1) ${lineProgress * 100}%,
              rgba(45,212,191,0.1) 100%)`,
            transition: 'background 0.3s ease-out',
          }}
        />
      </div>

      {/* ── Mobile line (left) ── */}
      <div
        className="sm:hidden absolute left-8 top-0 bottom-0 w-px pointer-events-none z-0"
        style={{
          background: `linear-gradient(to bottom,
            rgba(45,212,191,0.9) 0%,
            rgba(45,212,191,0.9) ${lineProgress * 100}%,
            rgba(45,212,191,0.08) ${lineProgress * 100}%,
            rgba(45,212,191,0.08) 100%)`,
          transition: 'background 0.3s ease-out',
        }}
      />

      {/* ── Steps ── */}
      {STEPS.map((step, i) => {
        const isLeft = i % 2 === 0;
        const isActive = i <= activeStep;
        const isClosest = i === activeStep;
        const title = t(step.titleKey, lang);
        const desc = t(step.descKey, lang);

        return (
          <div
            key={i}
            className={`timeline-step relative flex items-start gap-6 sm:gap-0 mb-12 sm:mb-0 last:mb-0 transition-opacity duration-500 sm:min-h-[200px] ${
              isActive ? 'opacity-100' : 'opacity-30'
            }`}
          >
            {/* ── Mobile: number left, content right ── */}
            <div className="sm:hidden shrink-0 z-10">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold border-2 transition-all duration-300 ${
                  isClosest
                    ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/30 scale-110'
                    : isActive
                      ? 'bg-teal-500/30 border-teal-400/60 text-teal-300'
                      : 'bg-white/5 border-white/10 text-white/30'
                }`}
              >
                {step.number}
              </div>
            </div>

            {/* ── Content card (mobile: full width; desktop: half width, alternating sides) ── */}
            <div
              className={`flex-1 sm:absolute sm:top-0 ${
                isLeft
                  ? 'sm:left-0 sm:pr-16 sm:text-right'
                  : 'sm:right-0 sm:pl-16 sm:text-left'
              }`}
              style={{ width: 'calc(50% - 40px)' }}
            >
              <div
                className={`p-5 sm:p-6 rounded-2xl border transition-all duration-500 ${
                  isClosest
                    ? 'bg-teal-500/[0.08] border-teal-400/40 shadow-[0_0_40px_rgba(45,212,191,0.12)]'
                    : isActive
                      ? 'bg-white/[0.04] border-white/[0.08]'
                      : 'bg-white/[0.02] border-white/[0.04]'
                }`}
              >
                <h3
                  className={`text-base sm:text-lg font-bold mb-1.5 transition-colors duration-300 ${
                    isClosest ? 'text-teal-300' : isActive ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {title}
                </h3>
                <p
                  className={`text-sm leading-relaxed transition-colors duration-300 ${
                    isClosest ? 'text-neutral-300' : isActive ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  {desc}
                </p>
              </div>
            </div>

            {/* ── Desktop: number circle in the center ── */}
            <div className="hidden sm:flex absolute left-1/2 top-6 -translate-x-1/2 z-10">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold border-2 transition-all duration-300 ${
                  isClosest
                    ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/30 scale-110'
                    : isActive
                      ? 'bg-teal-500/30 border-teal-400/60 text-teal-300'
                      : 'bg-white/5 border-white/10 text-white/30'
                }`}
              >
                {step.number}
              </div>
            </div>

            {/* ── Spacer for the empty side (desktop) ── */}
            <div className="hidden sm:block" style={{ width: 'calc(50% - 40px)' }} />
          </div>
        );
      })}
    </div>
  );
}