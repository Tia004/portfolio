'use client';
import React, { useRef, useEffect, useLayoutEffect, useCallback, useMemo, memo } from 'react';
import { loadGsap } from '@/lib/gsap-lazy';

import './DotGrid.css';

const throttle = (func: (...args: any[]) => void, limit: number) => {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  className?: string;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

const DotGrid: React.FC<DotGridProps> = memo(({
  dotSize = 16,
  gap = 32,
  baseColor = '#1a1a1a',
  activeColor = '#10B981',
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = '',
  style
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  // Idle-redraw gate: the grid must only repaint while the pointer is inside
  // the card OR while dots are still animating back (elastic return). Without
  // it, every card's rAF loop re-painted the whole grid each frame even when
  // nothing was moving — a major CPU/scroll hog on pages with many cards.
  const pointerInsideRef = useRef(false);
  const lastActivityRef = useRef(0);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  });

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor]);

  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null;
    const p = new Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + dotSize / 2;
    const startY = extraY / 2 + dotSize / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    if (!circlePath || !wrapperRef.current) return;

    let rafId: number;
    // DotGridCard (HomeShell) only mounts us on hover, so we're always
    // visible when alive. Starting isVisible=true skips the IntersectionObserver
    // async round-trip and paints the first frame immediately.
    let isVisible = true;
    const proxSq = proximity * proximity;
    // Covers the push tween (0.6s) + elastic return (up to ~1.5s) + margin.
    const RETURN_WINDOW_MS = (returnDuration + 1) * 1000;

    // Clear the idle-gate flag when the cursor leaves the wrapper. Without
    // this, a stationary cursor that leaves the card (or a card that slides
    // out from under a still mouse) would keep the flag true forever and the
    // expensive full-grid repaint would never gate itself off.
    const clearPointer = () => { pointerInsideRef.current = false; };
    const wrap = wrapperRef.current;
    wrap.addEventListener('mouseleave', clearPointer);

    const draw = () => {
      if (!isVisible) { rafId = 0; return; }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Idle redraw gate — keep the loop alive (cheap) but skip the expensive
      // full-grid repaint while the pointer is outside and no tween is running.
      if (!pointerInsideRef.current && performance.now() - lastActivityRef.current > RETURN_WINDOW_MS) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: px, y: py } = pointerRef.current;

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        let style = baseColor;
        if (dsq <= proxSq && px > 0 && py > 0) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          style = `rgb(${r},${g},${b})`;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = style;
        ctx.fill(circlePath);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    // Only run rAF when the element is visible
    const io = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && !rafId) {
        rafId = requestAnimationFrame(draw);
      }
    }, { threshold: 0 });
    io.observe(wrapperRef.current);

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
      wrap.removeEventListener('mouseleave', clearPointer);
    };
  }, [proximity, baseColor, activeRgb, baseRgb, circlePath, returnDuration]);

  useLayoutEffect(() => {
    buildGrid();
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(buildGrid);
      wrapperRef.current && ro.observe(wrapperRef.current);
    } else {
      (window as Window).addEventListener('resize', buildGrid);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', buildGrid);
    };
  }, [buildGrid]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = wrapperRef.current?.getBoundingClientRect();
      const inside = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      pointerInsideRef.current = inside;
      if (!inside) return;
      lastActivityRef.current = performance.now();
      const now = performance.now();
      const pr = pointerRef.current;
      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = maxSpeed;
      }
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.vx = vx;
      pr.vy = vy;
      pr.speed = speed;

      const rect = canvasRef.current!.getBoundingClientRect();
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
        if (speed > speedTrigger && dist < proximity && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          loadGsap().then((gsap) => {
            if (!dot._inertiaApplied) return;
            gsap.killTweensOf(dot);
            const pushX = dot.cx - pr.x + vx * 0.005;
            const pushY = dot.cy - pr.y + vy * 0.005;
            gsap.to(dot, {
              xOffset: pushX,
              yOffset: pushY,
              duration: 0.6,
              ease: 'power3.out',
              onComplete: () => {
                gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: returnDuration,
                  ease: 'elastic.out(1,0.75)'
                });
                dot._inertiaApplied = false;
              }
            });
          });
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const r = wrapperRef.current?.getBoundingClientRect();
      if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      lastActivityRef.current = performance.now();
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRadius && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          loadGsap().then((gsap) => {
            if (!dot._inertiaApplied) return;
            gsap.killTweensOf(dot);
            const falloff = Math.max(0, 1 - dist / shockRadius);
            const pushX = (dot.cx - cx) * shockStrength * falloff;
            const pushY = (dot.cy - cy) * shockStrength * falloff;
            gsap.to(dot, {
              xOffset: pushX,
              yOffset: pushY,
              duration: 0.6,
              ease: 'power3.out',
              onComplete: () => {
                gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: returnDuration,
                  ease: 'elastic.out(1,0.75)'
                });
                dot._inertiaApplied = false;
              }
            });
          });
        }
      }
    };

    // pointermove covers mouse, touch AND pen: on mobile the finger drags
    // across the services carousel and each card's grid lights up under the
    // finger as it passes (the `inside` rect check keeps off-card grids idle).
    const throttledMove = throttle(onMove, 50);
    window.addEventListener('pointermove', throttledMove, { passive: true });
    window.addEventListener('click', onClick);
    // When the finger lifts, pointerleave/pointercancel fire — clear the
    // inside flag so the grid's rAF loop gates itself off (idle = cheap).
    const clearOnLift = () => { pointerInsideRef.current = false; };
    window.addEventListener('pointerup', clearOnLift);
    window.addEventListener('pointercancel', clearOnLift);

    return () => {
      window.removeEventListener('pointermove', throttledMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('pointerup', clearOnLift);
      window.removeEventListener('pointercancel', clearOnLift);
    };
  }, [maxSpeed, speedTrigger, proximity, resistance, returnDuration, shockRadius, shockStrength]);

  return (
    <section className={`dot-grid ${className}`} style={style}>
      <div ref={wrapperRef} className="dot-grid__wrap">
        <canvas ref={canvasRef} className="dot-grid__canvas" />
      </div>
    </section>
  );
});

DotGrid.displayName = 'DotGrid';

export default DotGrid;
