'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

// ── Work process — general, covers all services ──
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
  index,
  lang,
}: {
  step: TimelineStep;
  index: number;
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

              {/* Small number badge — top-left, subtle */}
              <span className="absolute top-3 right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/15 border border-teal-500/30 text-[11px] font-bold text-teal-400 leading-none select-none">
                {index + 1}
              </span>

              {/* Content */}
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const nodesRef = useRef<SVGGElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileProgress, setMobileProgress] = useState(0);
  const pathLengthRef = useRef(0);
  const stRef = useRef<import('gsap/ScrollTrigger').ScrollTrigger | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // ── Scroll-driven SVG line drawing (desktop) ────────────────
  const initPath = useCallback(() => {
    const section = sectionRef.current;
    const pathEl = pathRef.current;
    const nodesG = nodesRef.current;
    if (!section || !pathEl || !nodesG) return 0;

    const w = section.clientWidth;
    const h = section.clientHeight;
    if (w === 0 || h === 0) return 0;

    // Grid geometry: 3 columns, 2 rows
    const cols = 3;
    const colW = w / cols;
    // Row centers (approximate): top row cards start at y≈0, bottom row at y≈55%
    const topCY = h * 0.28;
    const botCY = h * 0.78;

    const cx = (i: number) => colW * (i % cols) + colW / 2;
    const cy = (i: number) => (i < 3 ? topCY : botCY);

    // Connection points
    const pts = Array.from({ length: 6 }, (_, i) => ({ x: cx(i), y: cy(i) }));

    // Path: 1→2→3  curve-down  4→5→6
    const midY = (pts[2].y + pts[3].y) / 2;
    const curveRight = pts[2].x + colW * 0.35;

    const d = [
      `M ${pts[0].x} ${pts[0].y}`,
      `L ${pts[1].x} ${pts[1].y}`,
      `L ${pts[2].x} ${pts[2].y}`,
      `C ${pts[2].x} ${midY - 8}, ${curveRight} ${midY}, ${curveRight} ${midY + 8}`,
      `C ${curveRight} ${midY + 16}, ${pts[3].x} ${midY + 24}, ${pts[3].x} ${pts[3].y}`,
      `L ${pts[4].x} ${pts[4].y}`,
      `L ${pts[5].x} ${pts[5].y}`,
    ].join(' ');

    pathEl.setAttribute('d', d);
    const len = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = `${len}`;
    pathEl.style.strokeDashoffset = `${len}`;
    pathLengthRef.current = len;

    // Numbered circles at each junction
    nodesG.innerHTML = '';
    pts.forEach((p, i) => {
      // Outer glow circle
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', `${p.x}`);
      glow.setAttribute('cy', `${p.y}`);
      glow.setAttribute('r', '14');
      glow.setAttribute('fill', '#07110f');
      glow.setAttribute('stroke', 'rgba(45,212,191,0.5)');
      glow.setAttribute('stroke-width', '1.5');
      nodesG.appendChild(glow);

      // Number text
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', `${p.x}`);
      txt.setAttribute('y', `${p.y}`);
      txt.setAttribute('dy', '0.35em');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#5eead4');
      txt.setAttribute('font-size', '12');
      txt.setAttribute('font-weight', '700');
      txt.setAttribute('font-family', 'Outfit, ui-sans-serif, system-ui, sans-serif');
      txt.textContent = `${i + 1}`;
      nodesG.appendChild(txt);
    });

    return len;
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const section = sectionRef.current;
    if (!section) return;

    let alive = true;

    // Defer measurement until after layout (lazy section may have just mounted)
    const scheduleInit = () => {
      requestAnimationFrame(() => {
        if (!alive) return;
        const len = initPath();
        if (len === 0) {
          // Section might not be laid out yet — retry once
          requestAnimationFrame(() => {
            if (!alive) return;
            initPath();
          });
        }
      });
    };
    scheduleInit();

    const ro = new ResizeObserver(() => {
      initPath();
    });
    ro.observe(section);

    loadGsap().then((gsap) => {
      if (!alive) return;
      const ScrollTrigger = (gsap as unknown as { ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }).ScrollTrigger;
      if (!ScrollTrigger) return;

      stRef.current = ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 40%',
        scrub: 0.6,
        onUpdate(self: { progress: number }) {
          const pathEl = pathRef.current;
          if (!pathEl) return;
          const offset = pathLengthRef.current * (1 - self.progress);
          pathEl.style.strokeDashoffset = `${offset}`;
        },
      });
    });

    return () => {
      alive = false;
      stRef.current?.kill();
      ro.disconnect();
    };
  }, [isMobile, initPath]);

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
        {/* SVG line layer — sized to match section */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10 overflow-visible"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <filter id="process-line-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* The path — d attribute and stroke-dasharray set via JS */}
          <path
            ref={pathRef}
            fill="none"
            stroke="rgba(45, 212, 191, 0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#process-line-glow)"
          />
          {/* Numbered junction circles — created via JS */}
          <g ref={nodesRef} />
        </svg>

        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-5 sm:gap-7 mb-10 sm:mb-12 relative z-20">
          {STEPS.slice(0, 3).map((step, i) => (
            <div key={i}>
              <ProcessStepCard step={step} index={i} lang={lang} />
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-3 gap-5 sm:gap-7 relative z-20">
          {STEPS.slice(3, 6).map((step, i) => (
            <div key={i + 3}>
              <ProcessStepCard step={step} index={i + 3} lang={lang} />
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE: Horizontal scrollable timeline ── */}
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

        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-6 -mx-4">
          {STEPS.map((step, i) => (
            <article
              key={i}
              className="relative z-10 flex shrink-0 snap-center flex-col w-[78vw] max-w-[280px]"
            >
              {/* Numbered dot on the line */}
              <div className="flex items-center justify-center py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#07110f] border-2 border-teal-400/50 text-[11px] font-bold text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <ProcessStepCard step={step} index={i} lang={lang} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}