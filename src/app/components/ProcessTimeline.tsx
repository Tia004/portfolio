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
import { loadGsap } from '@/lib/gsap-lazy';

// ── General work process — applies to ALL services ──
const STEPS = [
  { number: 1, titleKey: 'processo.step1_title', descKey: 'processo.step1_desc', icon: BubbleChatIcon },
  { number: 2, titleKey: 'processo.step2_title', descKey: 'processo.step2_desc', icon: FilePenIcon },
  { number: 3, titleKey: 'processo.step3_title', descKey: 'processo.step3_desc', icon: PuzzleIcon },
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
            borderRadius={20}
            glowRadius={28}
            glowIntensity={2.0}
            edgeSensitivity={0}
            className="process-glow-card group h-full w-full"
          >
            {/* Square card via aspect-square */}
            <div className="relative flex h-full flex-col rounded-[20px] p-4 sm:p-5 aspect-square">
              {/* Large decorative number behind content */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1 select-none text-[3rem] sm:text-[4rem] font-black leading-none tracking-tighter text-white/[0.04]"
              >
                {String(step.number).padStart(2, '0')}
              </span>
              {/* DotGrid background */}
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
              {/* Content */}
              <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TiaIcon icon={step.icon} size={16} className="text-teal-400" />
                  <span className="text-teal-400 text-[10px] sm:text-xs font-medium tracking-wider">
                    STEP {String(step.number).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mb-1 text-sm sm:text-base font-semibold text-white leading-tight">
                  {t(step.titleKey, lang)}
                </h3>
                <p className="text-[11px] sm:text-xs leading-relaxed text-neutral-500 mt-auto">
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // ── Scroll-driven line drawing ──────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = lineCanvasRef.current;
    if (!section || !canvas || isMobile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let st: import('gsap/ScrollTrigger').ScrollTrigger | undefined;

    const drawPath = (progress: number) => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);

      // Define the path: 6 connection points (between cards)
      // Row 1: card1 → card2 → card3
      // Row 2: card6 ← card5 ← card4  (right to left)
      // Curve from card3 (bottom-right) to card4 (bottom-left)
      const margin = 60;
      const gap = 28;
      const cardW = (w - margin * 2 - gap * 2) / 3;
      // square cards: height equals width
      const topY = h * 0.22;
      const botY = h * 0.72;

      const x1 = margin + cardW / 2;
      const x2 = margin + cardW + gap + cardW / 2;
      const x3 = margin + (cardW + gap) * 2 + cardW / 2;
      const x4 = x3; // right column
      const x5 = x2; // middle column
      const x6 = x1; // left column

      // Path: rightward through row 1, curve down, leftward through row 2
      const totalLength = (x3 - x1) + 80 + (x4 - x6);
      const drawLen = totalLength * progress;
      let remaining = drawLen;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(45, 212, 191, 0.5)';
      ctx.shadowBlur = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Start at card 1 center
      ctx.moveTo(x1, topY);

      // Line to card 2
      const seg1 = x2 - x1;
      if (remaining > 0) {
        const drawTo = Math.min(remaining, seg1);
        ctx.lineTo(x1 + drawTo, topY);
        remaining -= seg1;
      }

      // Line to card 3
      if (remaining > 0 || drawLen >= seg1) {
        ctx.lineTo(x2, topY);
        const seg2 = x3 - x2;
        const drawTo = Math.min(Math.max(0, remaining), seg2);
        if (drawTo > 0) {
          ctx.lineTo(x2 + drawTo, topY);
        }
        remaining -= seg2;
      }

      // Curve down: 80px vertical curve from card3 bottom to card4 bottom
      if (remaining > 0 || drawLen >= seg1 + (x3 - x2)) {
        ctx.lineTo(x3, topY);
        ctx.lineTo(x3, topY + 30);
        const curveLen = 50;
        if (drawLen >= (x3 - x1) + curveLen) {
          ctx.lineTo(x3, botY - 20);
          ctx.lineTo(x4 - 20, botY);
        } else if (remaining > 0) {
          const curveProgress = Math.min(remaining, curveLen) / curveLen;
          const cy = topY + 30 + curveProgress * (botY - topY - 50);
          ctx.lineTo(x3, cy);
          if (curveProgress > 0.6) {
            const h2 = (curveProgress - 0.6) / 0.4;
            ctx.lineTo(x3 - h2 * (x3 - (x4 - 20)), botY - 20 + h2 * 20);
          }
        }
        remaining -= 80;
      }

      // Row 2: card4 → card5 → card6 (leftward)
      if (remaining > 0 || drawLen >= (x3 - x1) + 80) {
        ctx.lineTo(x4, botY);
        ctx.lineTo(x5, botY);
      }
      if (remaining > 0 || drawLen >= (x3 - x1) + 80 + (x4 - x5)) {
        const seg5 = x5 - x6;
        const drawTo = Math.min(Math.max(0, remaining + (x4 - x5)), seg5);
        if (drawTo > 0) ctx.lineTo(x5 - drawTo, botY);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Resize canvas
    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    loadGsap().then((gsap) => {
      const ScrollTrigger = (gsap as unknown as { ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }).ScrollTrigger;
      if (!ScrollTrigger) return;

      st = ScrollTrigger.create({
        trigger: section,
        start: 'top 65%',
        end: 'bottom 35%',
        onUpdate(self: { progress: number }) {
          drawPath(self.progress);
        },
      });
      // Draw initial state
      drawPath(0);
    });

    return () => {
      st?.kill();
      ro.disconnect();
    };
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
      {/* ── DESKTOP: 2 rows × 3 cards with scroll-drawn connecting line ── */}
      <div className="hidden md:block relative py-8">
        {/* Canvas for the connecting line */}
        <canvas
          ref={lineCanvasRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Row 1: cards 1-2-3 */}
        <div className="grid grid-cols-3 gap-7 mb-14 relative z-20">
          {STEPS.slice(0, 3).map((step) => (
            <div key={step.number}>
              <ProcessStepCard step={step} lang={lang} />
            </div>
          ))}
        </div>

        {/* Row 2: cards 4-5-6 */}
        <div className="grid grid-cols-3 gap-7 relative z-20">
          {STEPS.slice(3, 6).map((step) => (
            <div key={step.number}>
              <ProcessStepCard step={step} lang={lang} />
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE: Horizontal scrollable timeline ── */}
      <div className="md:hidden relative">
        {/* Horizontal progress line — fills as you scroll through the cards */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-4 right-4 top-[180px] z-0 h-px bg-white/[0.10]"
        >
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
              className="relative z-10 flex shrink-0 snap-center flex-col w-[75vw] max-w-[260px]"
            >
              {/* Dot on the line */}
              <div className="flex items-center justify-center py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-teal-400/60 bg-[#07110f] text-[10px] font-bold text-teal-300">
                  {step.number}
                </div>
              </div>
              {/* Card below — square via aspect-square */}
              <div className="aspect-square w-full">
                <ProcessStepCard step={step} lang={lang} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}