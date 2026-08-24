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
            <div className="relative flex h-full flex-col rounded-[20px] p-5 sm:p-6 bg-[#081410] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
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

  // ── Build path by measuring actual card positions ───────────
  const rebuildPath = useCallback(() => {
    const svg = svgRef.current;
    const pathEl = pathRef.current;
    const nodesG = nodesRef.current;
    const section = sectionRef.current;
    if (!svg || !pathEl || !nodesG || !section) return 0;

    // Query the 6 grid cells (each is a <div> containing a card)
    const cells = section.querySelectorAll<HTMLDivElement>('.grid > div');
    if (cells.length < 6) return 0;

    // Get SVG bounding rect — this is our coordinate system
    const svgRect = svg.getBoundingClientRect();
    const w = svgRect.width;
    const h = svgRect.height;
    if (w === 0 || h === 0) return 0;

    // Set viewBox so SVG coordinates match pixel positions relative to the SVG
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    // PreserveAspectRatio none: coordinates map 1:1 to pixels without scaling
    svg.setAttribute('preserveAspectRatio', 'none');

    // Map each cell's center to SVG-local coordinates
    const pts: { x: number; y: number }[] = [];
    cells.forEach((cell) => {
      const cr = cell.getBoundingClientRect();
      pts.push({
        x: cr.left + cr.width / 2 - svgRect.left,
        y: cr.top + cr.height / 2 - svgRect.top,
      });
    });

    // Path: 1→2→3  curve-down  4→5→6
    const midY = (pts[2].y + pts[3].y) / 2;
    // Curve arcs right before coming back left
    const curveRight = pts[2].x + (pts[3].x - pts[2].x) * 0.5;

    const d = [
      `M ${pts[0].x} ${pts[0].y}`,
      `L ${pts[1].x} ${pts[1].y}`,
      `L ${pts[2].x} ${pts[2].y}`,
      // Smooth bezier curve: down from card 3, arcs right, ends at card 4
      `C ${pts[2].x} ${midY - 6}, ${curveRight} ${midY}, ${curveRight} ${midY + 6}`,
      `C ${curveRight} ${midY + 12}, ${pts[3].x} ${midY + 20}, ${pts[3].x} ${pts[3].y}`,
      `L ${pts[4].x} ${pts[4].y}`,
      `L ${pts[5].x} ${pts[5].y}`,
    ].join(' ');

    pathEl.setAttribute('d', d);
    const len = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = `${len}`;
    pathEl.style.strokeDashoffset = `${len}`;
    pathLengthRef.current = len;

    // Large decorative numbers at each junction — no circle, just transparent text
    nodesG.innerHTML = '';
    pts.forEach((p, i) => {
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', `${p.x}`);
      txt.setAttribute('y', `${p.y}`);
      txt.setAttribute('dy', '0.32em');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', 'rgba(45, 212, 191, 0.35)');
      txt.setAttribute('font-size', '40');
      txt.setAttribute('font-weight', '900');
      txt.setAttribute('font-family', 'Outfit, ui-sans-serif, system-ui, sans-serif');
      txt.setAttribute('letter-spacing', '-0.03em');
      txt.textContent = `${i + 1}`;
      nodesG.appendChild(txt);
    });

    return len;
  }, []);

  // ── Desktop: init path THEN setup ScrollTrigger ─────────────
  useEffect(() => {
    if (isMobile) return;
    const section = sectionRef.current;
    if (!section) return;

    let alive = true;

    // Step 1: wait for layout, measure & build path. Retry until success.
    let attempts = 0;
    const tryInit = () => {
      if (!alive) return;
      const len = rebuildPath();
      if (len > 0) {
        // Path ready — now setup ScrollTrigger
        setupST();
        return;
      }
      attempts++;
      if (attempts < 10) {
        requestAnimationFrame(tryInit);
      }
    };

    const setupST = () => {
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
    };

    // Start with one rAF to let DOM settle, then try
    requestAnimationFrame(tryInit);

    // Rebuild on resize
    const ro = new ResizeObserver(() => {
      rebuildPath();
    });
    ro.observe(section);

    return () => {
      alive = false;
      stRef.current?.kill();
      ro.disconnect();
    };
  }, [isMobile, rebuildPath]);

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
        {/* SVG sits on top of the cards, sized to the grid container */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <filter id="process-line-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            ref={pathRef}
            fill="none"
            stroke="rgba(45, 212, 191, 0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#process-line-glow)"
          />
          <g ref={nodesRef} />
        </svg>

        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-5 sm:gap-7 mb-10 sm:mb-12 relative z-20">
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

        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-6 -mx-4">
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