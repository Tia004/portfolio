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
            <div className="relative flex h-full flex-col rounded-[20px] p-6 sm:p-7">
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
              <div className="relative z-10 flex flex-col gap-3">
                <TiaIcon icon={step.icon} size={22} className="text-teal-400" />
                <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                  {t(step.titleKey, lang)}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400">
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
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
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

  // ── Scroll-driven line drawing (desktop) ────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const svg = svgRef.current;
    const pathEl = pathRef.current;
    if (!section || !svg || !pathEl || isMobile) return;

    let st: import('gsap/ScrollTrigger').ScrollTrigger | undefined;

    // Measure the path and set up stroke-dashoffset
    const initPath = () => {
      const rect = svg.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      svg.setAttribute('width', `${rect.width}`);
      svg.setAttribute('height', `${rect.height}`);

      const w = rect.width;
      const h = rect.height;

      // Card positions in the 2×3 grid (proportional to viewBox)
      const colW = w / 3;
      const rowH = h * 0.42; // top row takes ~42% of height
      const gap = 32; // gap between rows in px (matches grid gap)

      // Centers of each card in SVG coordinates
      const cx = (i: number) => colW * (i % 3) + colW / 2;
      const cy = (i: number) => (i < 3 ? rowH / 2 : rowH + gap + rowH / 2);

      // Build path: 1→2→3 curve→4→5→6
      const c1 = `${cx(0)},${cy(0)}`;
      const c2 = `${cx(1)},${cy(1)}`;
      const c3 = `${cx(2)},${cy(2)}`;
      const c4 = `${cx(3)},${cy(3)}`;
      const c5 = `${cx(4)},${cy(4)}`;
      const c6 = `${cx(5)},${cy(5)}`;

      // Curve control point: vertical line from c3 to c4 with a bezier
      const midY = (cy(2) + cy(3)) / 2;
      const cpX = cx(2) + colW * 0.4; // curve pushes right

      const d = [
        `M ${c1}`,
        `L ${c2}`,
        `L ${c3}`,
        `C ${cx(2)} ${midY - 10}, ${cpX} ${midY}, ${cpX} ${midY + 10}`,
        `C ${cpX} ${midY + 20}, ${cx(3)} ${midY + 30}, ${c4}`,
        `L ${c5}`,
        `L ${c6}`,
      ].join(' ');

      pathEl.setAttribute('d', d);
      const length = pathEl.getTotalLength();
      pathEl.style.strokeDasharray = `${length}`;
      pathEl.style.strokeDashoffset = `${length}`;

      return length;
    };

    let pathLength = initPath();

    const resize = () => {
      const len = initPath();
      if (len) pathLength = len;
      // Re-sync current progress
      if (st && 'progress' in st) {
        const offset = pathLength * (1 - (st as { progress: number }).progress);
        pathEl.style.strokeDashoffset = `${offset}`;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    loadGsap().then((gsap) => {
      const ScrollTrigger = (gsap as unknown as { ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }).ScrollTrigger;
      if (!ScrollTrigger) return;

      st = ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 40%',
        scrub: 0.6,
        onUpdate(self: { progress: number }) {
          if (!pathEl) return;
          const offset = pathLength * (1 - self.progress);
          pathEl.style.strokeDashoffset = `${offset}`;
        },
      });
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
      {/* ── DESKTOP: 2 rows × 3 cards + SVG scroll-drawn line ── */}
      <div className="hidden md:block relative py-6">
        {/* SVG connecting line — animated with stroke-dashoffset via ScrollTrigger scrub */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10 overflow-visible"
          style={{ width: '100%', height: '100%' }}
        >
          <path
            ref={pathRef}
            fill="none"
            stroke="rgba(45, 212, 191, 0.55)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#process-glow)"
          />
          <defs>
            <filter id="process-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Row 1: cards 1-2-3 */}
        <div className="grid grid-cols-3 gap-6 sm:gap-8 mb-8 relative z-20">
          {STEPS.slice(0, 3).map((step, i) => (
            <div key={i}>
              <ProcessStepCard step={step} lang={lang} />
            </div>
          ))}
        </div>

        {/* Row 2: cards 4-5-6 */}
        <div className="grid grid-cols-3 gap-6 sm:gap-8 relative z-20">
          {STEPS.slice(3, 6).map((step, i) => (
            <div key={i + 3}>
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
          className="pointer-events-none absolute left-4 right-4 top-[32px] z-0 h-px bg-white/[0.10]"
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
          {STEPS.map((step, i) => (
            <article
              key={i}
              className="relative z-10 flex shrink-0 snap-center flex-col w-[78vw] max-w-[280px]"
            >
              {/* Dot on the line */}
              <div className="flex items-center justify-center py-3">
                <div className="flex h-2.5 w-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
              </div>
              {/* Card */}
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