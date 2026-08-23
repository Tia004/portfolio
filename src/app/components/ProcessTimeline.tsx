'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  mobileActive,
}: {
  step: TimelineStep;
  lang: 'it' | 'en' | 'es';
  mobileActive: boolean;
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
            className={`process-glow-card group h-full w-full ${mobileActive ? 'scroll-glow-active' : ''}`}
          >
            <div className="relative flex h-full min-h-[205px] flex-col justify-between rounded-[20px] p-5">
              <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
              <div className="relative z-10 flex items-center gap-2">
                <TiaIcon icon={step.icon} size={18} className="text-teal-400" />
                <span className="text-teal-400 text-sm">0{step.number}</span>
              </div>
              <div className="relative z-10">
                <h3 className="mb-1 text-base font-medium text-white">{t(step.titleKey, lang)}</h3>
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [nativeTrack, setNativeTrack] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateTimeline = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const scrollLeft = track.scrollLeft;
    const nextProgress = maxScroll > 1 ? scrollLeft / maxScroll : 1;
    const center = track.getBoundingClientRect().left + track.clientWidth / 2;
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    track.querySelectorAll<HTMLElement>('[data-timeline-step]').forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });

    setProgress(Math.min(1, Math.max(0, nextProgress)));
    setActiveStep(closest);
    setCanPrev(scrollLeft > 8);
    setCanNext(scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const sync = () => setNativeTrack(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const scheduleUpdate = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateTimeline();
      });
    };
    const resize = new ResizeObserver(scheduleUpdate);
    resize.observe(track);
    track.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      track.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
      resize.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [updateTimeline]);

  const move = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    navigator.vibrate?.(12);
    const first = track.querySelector<HTMLElement>('[data-timeline-step]');
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    const amount = (first?.offsetWidth ?? track.clientWidth * 0.8) + gap;
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-7xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[260px] z-0 h-px bg-white/[0.10]">
        <div
          className="h-full origin-left bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.55)] transition-[width] duration-150 ease-out"
          style={{ width: `${Math.max(8, progress * 100)}%` }}
        />
      </div>

      <div
        ref={trackRef}
        data-lenis-prevent={nativeTrack ? '' : undefined}
        data-lenis-prevent-touch={nativeTrack ? '' : undefined}
        className="relative z-10 flex h-[520px] snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain px-[max(1rem,calc((100vw-80rem)/2))] pb-8 scrollbar-hide"
        style={{ touchAction: 'pan-x pan-y' }}
        aria-label={lang === 'it' ? 'Percorso di lavoro' : lang === 'es' ? 'Proceso de trabajo' : 'Work process'}
      >
        {STEPS.map((step, index) => {
          const active = index === activeStep;
          const above = index % 2 === 0;
          return (
            <article
              key={step.number}
              data-timeline-step
              aria-current={active ? 'step' : undefined}
              className="relative z-10 flex h-full w-[78vw] max-w-[300px] shrink-0 snap-center flex-col justify-between sm:w-[300px] sm:max-w-none"
            >
              <div className={`flex h-[205px] flex-col justify-end ${above ? '' : 'invisible'}`} aria-hidden={!above}>
                {above && (
                  <ProcessStepCard step={step} lang={lang} mobileActive={nativeTrack && active} />
                )}
              </div>

              <div className="relative flex h-10 shrink-0 items-center justify-center">
                <div className={`absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${active
                  ? 'border-teal-300 bg-teal-500 text-white shadow-[0_0_24px_rgba(45,212,191,0.45)]'
                  : 'border-white/20 bg-[#07110f] text-teal-300'
                  }`}>
                  {step.number}
                </div>
              </div>

              <div className={`flex h-[205px] flex-col justify-start ${above ? 'invisible' : ''}`} aria-hidden={above}>
                {!above && (
                  <ProcessStepCard step={step} lang={lang} mobileActive={nativeTrack && active} />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-4 sm:px-0">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          {String(activeStep + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={!canPrev}
            aria-label={lang === 'it' ? 'Passo precedente' : lang === 'es' ? 'Paso anterior' : 'Previous step'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:border-teal-400/50 hover:bg-teal-400/10 disabled:pointer-events-none disabled:opacity-25"
          >
            <TiaIcon icon={ArrowRight01Icon} size={17} className="-rotate-180" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={!canNext}
            aria-label={lang === 'it' ? 'Passo successivo' : lang === 'es' ? 'Paso siguiente' : 'Next step'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:border-teal-400/50 hover:bg-teal-400/10 disabled:pointer-events-none disabled:opacity-25"
          >
            <TiaIcon icon={ArrowRight01Icon} size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
