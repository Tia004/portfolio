'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';
import TiaIcon from './TiaIcon';
import BorderGlow from './BorderGlow';
import DotGrid from './DotGrid';
import { DotGridCard, TiltCard } from './InteractiveCard';
import {
  ArrowRight01Icon,
  BubbleChatIcon,
  CheckmarkCircle01Icon,
  CodeIcon,
  FilePenIcon,
  PuzzleIcon,
} from './icons';
import { t } from '@/lib/translations';

const STEPS = [
  { titleKey: 'processo.step1_title', descKey: 'processo.step1_desc', icon: BubbleChatIcon },
  { titleKey: 'processo.step2_title', descKey: 'processo.step2_desc', icon: FilePenIcon },
  { titleKey: 'processo.step3_title', descKey: 'processo.step3_desc', icon: PuzzleIcon },
  { titleKey: 'processo.step4_title', descKey: 'processo.step4_desc', icon: CodeIcon },
  { titleKey: 'processo.step5_title', descKey: 'processo.step5_desc', icon: CheckmarkCircle01Icon },
  { titleKey: 'processo.step6_title', descKey: 'processo.step6_desc', icon: ArrowRight01Icon },
] as const;

type TimelineStep = (typeof STEPS)[number];

function ProcessStepCard({
  step,
  stepIndex,
  lang,
}: {
  step: TimelineStep;
  stepIndex: number;
  lang: 'it' | 'en' | 'es';
}) {
  return (
    <DotGridCard className="h-full w-full">
      {(mounted, fadeIn) => (
        <TiltCard className="h-full w-full">
          <BorderGlow
            borderRadius={20}
            glowRadius={28}
            glowIntensity={2.0}
            edgeSensitivity={0}
            className="group h-full w-full"
          >
            <div className="relative flex h-full flex-col rounded-[20px] p-5 sm:p-6 overflow-hidden">
              <div
                className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] transition-opacity duration-500 ${
                  fadeIn ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {mounted && (
                  <DotGrid
                    dotSize={3}
                    gap={14}
                    baseColor="#0a0a0a"
                    activeColor="#10B981"
                    proximity={100}
                    shockRadius={200}
                    shockStrength={4}
                    resistance={700}
                    returnDuration={1.2}
                  />
                )}
              </div>

              {/* Large translucent step number behind everything */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute select-none"
                style={{
                  right: '12px',
                  bottom: '-14px',
                  fontSize: 'clamp(5.5rem, 11vw, 8.5rem)',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: 'rgba(45, 212, 191, 0.06)',
                  fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
                  letterSpacing: '-0.04em',
                }}
              >
                {stepIndex + 1}
              </span>

              <div className="relative z-10 flex flex-col gap-2.5">
                <TiaIcon icon={step.icon} size={20} className="text-teal-400" />
                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
                  {t(step.titleKey, lang)}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-neutral-400">
                  {t(step.descKey, lang)}
                </p>
              </div>
            </div>
          </BorderGlow>
        </TiltCard>
      )}
    </DotGridCard>
  );
}

export default function ProcessTimeline() {
  const { lang } = useLanguage();
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileProgress, setMobileProgress] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Mobile: horizontal scroll progress
  useEffect(() => {
    const track = mobileTrackRef.current;
    if (!track || !isMobile) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setMobileProgress(max > 1 ? track.scrollLeft / max : 1);
    };
    track.addEventListener('scroll', update, { passive: true });
    update();
    return () => track.removeEventListener('scroll', update);
  }, [isMobile]);

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* ── DESKTOP: 2 rows × 3 cards — no line, numbers inside cards ── */}
      <div className="hidden md:block py-8">
        <div className="grid grid-cols-3 gap-5 sm:gap-7 mb-8 sm:mb-10">
          {STEPS.slice(0, 3).map((step, i) => (
            <div key={i}>
              <ProcessStepCard step={step} stepIndex={i} lang={lang} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5 sm:gap-7">
          {STEPS.slice(3, 6).map((step, i) => (
            <div key={i + 3}>
              <ProcessStepCard step={step} stepIndex={i + 3} lang={lang} />
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="md:hidden relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-4 right-4 top-[28px] z-0 h-px bg-white/[0.08]"
        >
          <div
            className="h-full origin-left bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
            style={{ width: `${Math.max(0, Math.min(100, mobileProgress * 100))}%` }}
          />
        </div>

        <div
          ref={mobileTrackRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-6 -mx-4"
        >
          {STEPS.map((step, i) => (
            <article
              key={i}
              className="relative z-10 flex shrink-0 snap-center flex-col w-[78vw] max-w-[280px]"
            >
              <div className="flex items-center justify-center py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#07110f] border-2 border-teal-400/50 text-[11px] font-bold text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <ProcessStepCard step={step} stepIndex={i} lang={lang} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}