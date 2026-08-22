'use client';

import { useRef, useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { scheduleTick, unscheduleTick } from '@/lib/useSharedTicker';
import './BorderGlow.css';

interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  /** Extra inline styles merged onto the card (e.g. a dynamic height cap). */
  style?: React.CSSProperties;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
  /** Continuously rotate the glow around the border while hovering */
  continuousHover?: boolean;
  /** Use a SINGLE traveling arc instead of the default dual-arc mask.
   *  The default conic mask lights TWO arcs 180° apart, so while the glow
   *  passes a corner the OPPOSITE corner also lights up ("arrives first",
   *  "on other borders"). Single-beam keeps exactly one arc on the border. */
  singleBeam?: boolean;
}

function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars: Record<string, string> = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x: number) { return x * x * x; }

interface AnimateOpts {
  start?: number; end?: number; duration?: number; delay?: number;
  ease?: (t: number) => number; onUpdate: (v: number) => void; onEnd?: () => void;
}

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }: AnimateOpts) {
  const t0 = performance.now() + delay;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  setTimeout(() => requestAnimationFrame(tick), delay);
}

const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  edgeSensitivity = 0,
  style,
  glowColor = '170 80 50',
  backgroundColor = 'rgba(6, 10, 10, 0.62)',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 2.0,
  coneSpread = 7,
  animated = false,
  colors = ['#2dd4bf', '#14b8a6', '#5eead4'],
  fillOpacity = 0.5,
  continuousHover = false,
  singleBeam = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  // Force-exit hover when the card leaves the viewport so the shared ticker
  // callback is unscheduled immediately (no stale glow). Hover itself implies
  // the pointer is over the card, so no visibility gate is needed on the
  // handlers — this observer only handles the "card scrolls away mid-hover"
  // case, saving CPU on the ~300 marquee cards without any state re-renders.
  //
  // Also pre-warms --edge-proximity to 100 as soon as the card mounts or
  // enters the viewport.  The :not(:hover) CSS rule keeps the pseudo-elements
  // at opacity:0 until actual hover, so the glow is invisible.  When the user
  // does hover, --edge-proximity is already 100 — the calc() opacity snaps to
  // 1 instantly (transition:none on :hover).  Zero-frame delay, even when the
  // card was just mounted by LazySection.
  // useLayoutEffect fires synchronously after DOM mutations but before
  // paint — no frame delay. The IO + :hover gate runs instantly.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsHovered(false);
        } else {
          // Pre-warm: glow is ready before the first hover touches this card.
          card.style.setProperty('--edge-proximity', '100');
        }
      },
      { rootMargin: '150px 0px' }
    );
    io.observe(card);
    // Pre-warm on mount — the card may already be in the viewport when
    // LazySection renders it (rootMargin may have triggered before mount).
    card.style.setProperty('--edge-proximity', '100');
    // LazySection mounts cards while the user's mouse may already be over
    // them. The :hover CSS pseudo-class fires, but mouseenter does not
    // (the element appeared under the pointer — it didn't "enter" it).
    // Check synchronously and fire handleMouseEnter if already hovered.
    if (card.matches(':hover')) {
      handleMouseEnter();
    }
    return () => io.disconnect();
  }, []);

  const getCenterOfElement = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getCursorAngle = useCallback((el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }, [getCenterOfElement]);

  // Continuous rotation while hovering — registers a single tick callback
  // with the shared rAF scheduler. Only ONE card can be hovered at a time,
  // so painting every frame is cheap and keeps the glow buttery-smooth.
  // No lenis-scrolling gate: the rotation must keep advancing even during
  // scroll momentum so the glow is never "frozen" mid-animation.
  const continuousTick = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    angleRef.current = (angleRef.current + 1.2) % 360;
    card.style.setProperty('--cursor-angle', `${angleRef.current}deg`);
  }, []);

  // Ref-cache continuousTick so the cleanup effect can use empty deps [].
  // This eliminates the HMR "dependency array size changed" warning
  // that occurs when old component instances (2 deps) are compared to
  // new instances (1 dep) during hot reload.
  const continuousTickRef = useRef(continuousTick);
  continuousTickRef.current = continuousTick;

  useEffect(() => {
    return () => unscheduleTick(continuousTickRef.current);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Note: no isVisibleRef gate here — if the pointer is over the card the
    // card is visible by definition, and the IO below force-exits hover when
    // the card scrolls off-screen (which unschedules the shared ticker).
    if (continuousHover && isHovered) return; // continuous mode ignores pointer position
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angle = getCursorAngle(card, x, y);
    card.style.setProperty('--edge-proximity', '100');
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, [getCursorAngle, continuousHover, isHovered]);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    // Restart the continuous glow from 0° on every hover.
    angleRef.current = 0;
    card.style.setProperty('--cursor-angle', '0deg');
    card.style.setProperty('--edge-proximity', '100');
    void card.offsetHeight;
    // Schedule rotation IMMEDIATELY — synchronous, no useEffect delay.
    // The CSS fade-in takes 150ms; by the time the glow is visible,
    // the angle has already advanced ~1°, so it never looks static.
    scheduleTick(continuousTick, 'BorderGlow');
    setIsHovered(true);
  }, [continuousTick]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--edge-proximity', '0');
    // Stop rotation immediately — don't wait for useEffect cleanup
    unscheduleTick(continuousTick);
    setIsHovered(false);
  }, [continuousTick]);

  useEffect(() => {
    if (!animated || !cardRef.current) return;
    const card = cardRef.current;
    const angleStart = 110;
    const angleEnd = 465;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animateValue({ duration: 500, onUpdate: v => card.style.setProperty('--edge-proximity', `${v}`) });
    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }});
    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }});
    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => card.style.setProperty('--edge-proximity', `${v}`),
      onEnd: () => card.classList.remove('sweep-active'),
    });
  }, [animated]);

  const glowVars = buildGlowVars(glowColor, glowIntensity);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`border-glow-card ${continuousHover ? 'border-glow-continuous' : ''} ${singleBeam ? 'border-glow-single' : ''} ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        '--fill-opacity': fillOpacity,
        ...glowVars,
        ...buildGradientVars(colors),
        ...style,
      } as React.CSSProperties}
    >
      <span className="edge-light" />
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
