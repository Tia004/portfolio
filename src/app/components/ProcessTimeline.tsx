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
  FigmaIcon,
} from './icons';
import { t } from '@/lib/translations';
import { loadGsap } from '@/lib/gsap-lazy';

const STEPS = [
  { number: 1, titleKey: 'processo.step1_title', descKey: 'processo.step1_desc', icon: BubbleChatIcon },
  { number: 2, titleKey: 'processo.step2_title', descKey: 'processo.step2_desc', icon: FilePenIcon },
  { number: 3, titleKey: 'processo.step3_title', descKey: 'processo.step3_desc', icon: FigmaIcon },
  { number: 4, titleKey: 'processo.step4_title', descKey: 'processo.step4_desc', icon: CodeIcon },
  { number: 5, titleKey: 'processo.step5_title', descKey: 'processo.step5_desc', icon: CheckmarkCircle01Icon },
  { number: 6, titleKey: 'processo.step6_title', descKey: 'processo.step6_desc', icon: ArrowRight01Icon },
] as const;

type TimelineStep = (typeof STEPS)[number];

function ProcessStepCard({
  step,
  lang,
}: {
  step: TimelineStep;
  lang: 'it' | 'en' | 'es';
}) {
  return (
    <DotGridCard className="h-full w-full">
      {(mounted, fadeIn) => (
        <TiltCard className="h-full w-full">
          <BorderGlow
            continuousHover
            borderRadius={20}
            glowRadius={30}
            glowIntensity={2.2}
            edgeSensitivity={0}
            className="process-glow-card group h-full w-full"
          >
            <div className="relative flex h-full min-h-[180px] flex-col rounded-[20px] p-5">
              {/* Large decorative number behind content */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1 select-none text-[4.5rem] font-black leading-none tracking-tighter text-white/[0.04]"
              >
                {String(step.number).padStart(2, '0')}
              </span>
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
              <div className="relative z-10 flex items-center gap-2 mb-3">
                <TiaIcon icon={step.icon} size={18} className="text-teal-400" />
                <span className="text-teal-400 text-xs font-medium tracking-wider">STEP {String(step.number).padStart(2, '0')}</span>
              </div>
              <div className="relative z-10">
                <h3 className="mb-1.5 text-base font-semibold text-white">{t(step.titleKey, lang)}</h3>
                <p className="text-xs leading-relaxed text-neutral-500">{t(step.descKey, lang)}</p>
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const mobileLineRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileProgress, setMobileProgress] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Scroll-driven line fill (desktop) or horizontal progress (mobile)
  useEffect(() => {
    const section = sectionRef.current;
    const line = lineRef.current;
    if (!section || !line) return;

    let st: import('gsap/ScrollTrigger').ScrollTrigger | undefined;

    loadGsap().then((gsap) => {
      // ScrollTrigger is registered on the gsap instance by gsap-lazy.
      const ScrollTrigger = (gsap as unknown as { ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }).ScrollTrigger;
      if (!ScrollTrigger) return;

      if (!isMobile) {
        // Desktop: vertical line draws top→bottom as user scrolls through the section
        st = ScrollTrigger.create({
          trigger: section,
          start: 'top 70%',
          end: 'bottom 30%',
          onUpdate(self: { progress: number }) {
            line.style.transform = `scaleY(${self.progress})`;
          },
        });
      }
    });

    return () => {
      st?.kill();
    };
  }, [isMobile]);

  // On mount, set initial scaleY(0) for the line
  useEffect(() => {
    const line = lineRef.current;
    if (line && !isMobile) {
      line.style.transform = 'scaleY(0)';
    }
  }, [isMobile]);

  // Mobile: horizontal scroll progress drives the line fill
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
    <div ref={sectionRef} className="relative mx-auto w-full max-w-5xl">
      {/* ── DESKTOP: Vertical timeline with center line ── */}
      <div className="hidden md:block relative">
        {/* Center line — draws top→bottom with scroll */}
        <div
          ref={lineRef}
          aria-hidden="true"
          className="absolute left-1/2 top-0 w-px origin-top bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
          style={{
            height: '100%',
            transform: 'scaleY(0)',
            transition: 'none',
          }}
        />

        <div className="relative flex flex-col gap-16 py-8">
          {STEPS.map((step, index) => {
            const isLeft = index % 2 === 0;
            return (
              <div key={step.number} className="relative flex items-center">
                {/* Left side (even steps) */}
                <div className="w-1/2 pr-10">
                  {isLeft && <ProcessStepCard step={step} lang={lang} />}
                </div>

                {/* Center dot on the line */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-teal-400/60 bg-[#07110f] text-sm font-bold text-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.25)]">
                  {step.number}
                </div>

                {/* Right side (odd steps) */}
                <div className="w-1/2 pl-10">
                  {!isLeft && <ProcessStepCard step={step} lang={lang} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MOBILE: Horizontal scrollable timeline ── */}
      <div className="md:hidden relative">
        {/* Horizontal progress line — fills as you scroll through the cards */}
        <div aria-hidden="true" className="pointer-events-none absolute left-4 right-4 top-[190px] z-0 h-px bg-white/[0.10]">
          <div
            ref={mobileLineRef}
            className="h-full origin-left bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.55)]"
            style={{ width: `${Math.max(0, Math.min(100, mobileProgress * 100))}%` }}
          />
        </div>

        <div
          ref={mobileTrackRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-6 -mx-4"
        >
          {STEPS.map((step) => (
            <article
              key={step.number}
              className="relative z-10 flex shrink-0 snap-center flex-col w-[80vw] max-w-[300px]"
            >
              {/* Dot on the line */}
              <div className="flex items-center justify-center py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-teal-400/60 bg-[#07110f] text-xs font-bold text-teal-300">
                  {step.number}
                </div>
              </div>
              {/* Card below */}
              <div className="flex-1">
                <ProcessStepCard step={step} lang={lang} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}