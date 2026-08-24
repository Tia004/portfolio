'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
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
            className="group h-full w-full"
          >
            <div className="relative flex h-full flex-col rounded-[20px] p-5 sm:p-6">
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

/* ── SVG path: percentage-based so it adapts to any container size ───
   The path connects the 6 card centers in a 3×2 grid:
     [1] ─ [2] ─ [3]
                   │
     [4] ─ [5] ─ [6]

   ViewBox is 0 0 100 100, the path uses percent coords.
   Card centers are at these percentages:
   Row 1 (y ~ 24%): col 1=16.5%, col 2=50%, col 3=83.5%
   Row 2 (y ~ 73%): col 1=16.5%, col 2=50%, col 3=83.5%

   The numbers float near each center. */
const PATH_D = (() => {
  // Row 1
  const r1y = 24;
  const r2y = 73;
  const c1x = 16.5;
  const c2x = 50;
  const c3x = 83.5;
  // Curve control points — arc down from card 3 to card 4
  const midY = (r1y + r2y) / 2;
  // Arc right then come back
  const arcX = c3x + 8;

  return [
    `M ${c1x} ${r1y}`,
    `L ${c2x} ${r1y}`,
    `L ${c3x} ${r1y}`,
    `C ${c3x} ${midY - 5}, ${arcX} ${midY}, ${arcX} ${midY + 5}`,
    `C ${arcX} ${midY + 10}, ${c3x} ${midY + 15}, ${c3x} ${r2y}`,
    `L ${c2x} ${r2y}`,
    `L ${c1x} ${r2y}`,
  ].join(' ');
})();

const NUMBER_POSITIONS = [
  { x: 16.5, y: 21 },
  { x: 50,   y: 21 },
  { x: 83.5, y: 21 },
  { x: 83.5, y: 77 },
  { x: 50,   y: 77 },
  { x: 16.5, y: 77 },
];

export default function ProcessTimeline() {
  const { lang } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileProgress, setMobileProgress] = useState(0);
  const stRef = useRef<import('gsap/ScrollTrigger').ScrollTrigger | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // ── Desktop: measure & setup ScrollTrigger ─────────────
  useLayoutEffect(() => {
    if (isMobile) return;
    const section = sectionRef.current;
    const pathEl = pathRef.current;
    if (!section || !pathEl) return;

    let alive = true;

    const setup = () => {
      if (!alive) return;
      const len = pathEl.getTotalLength();
      if (len === 0) {
        // Path not yet measurable — retry next frame
        requestAnimationFrame(setup);
        return;
      }
      pathEl.style.strokeDasharray = `${len}`;
      pathEl.style.strokeDashoffset = `${len}`;

      loadGsap().then((gsap) => {
        if (!alive) return;
        const stModule = gsap as unknown as { ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger };
        const ScrollTrigger = stModule.ScrollTrigger;
        if (!ScrollTrigger) return;

        stRef.current?.kill();
        stRef.current = ScrollTrigger.create({
          trigger: section,
          start: 'top 65%',
          end: 'bottom 35%',
          scrub: 0.6,
          onUpdate(self: { progress: number }) {
            if (!pathEl) return;
            const offset = len * (1 - self.progress);
            pathEl.style.strokeDashoffset = `${offset}`;
          },
        });
      });
    };

    // Double rAF: let layout settle after LazySection mount
    requestAnimationFrame(() => requestAnimationFrame(setup));

    // Rebuild on resize
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newLen = pathEl.getTotalLength();
        if (newLen > 0) {
          pathEl.style.strokeDasharray = `${newLen}`;
        }
      }, 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      stRef.current?.kill();
      stRef.current = undefined;
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [isMobile]);

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
    <div ref={sectionRef} className="relative mx-auto w-full max-w-5xl">
      {/* ── DESKTOP: 2 rows × 3 cards + SVG line ── */}
      <div className="hidden md:block relative py-8">
        {/* SVG covers the full grid, viewBox is percentage-based (0-100).
            The path uses the same percentage coords, so it adapts to ANY
            container size without measuring DOM rects. */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="process-line-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* The path — dasharray + dashoffset set by JS for scroll drawing */}
          <path
            ref={pathRef}
            d={PATH_D}
            fill="none"
            stroke="rgba(45, 212, 191, 0.6)"
            strokeWidth="0.45"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#process-line-glow)"
            vectorEffect="non-scaling-stroke"
          />
          {/* Large decorative numbers */}
          {NUMBER_POSITIONS.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(45, 212, 191, 0.3)"
              fontSize="6"
              fontWeight="900"
              fontFamily="Outfit, ui-sans-serif, system-ui, sans-serif"
              letterSpacing="-0.03em"
            >
              {i + 1}
            </text>
          ))}
        </svg>

        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-5 sm:gap-7 mb-14 sm:mb-16 relative z-20">
          {STEPS.slice(0, 3).map((step, i) => (
            <div key={i}>
              <ProcessStepCard step={step} lang={lang} />
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-3 gap-5 sm:gap-7 relative z-20">
          {STEPS.slice(3, 6).map((step, i) => (
            <div key={i + 3}>
              <ProcessStepCard step={step} lang={lang} />
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
                <ProcessStepCard step={step} lang={lang} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}