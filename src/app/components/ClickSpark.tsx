'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isLowEndDevice } from '@/lib/useDeviceCapabilities';
import { scheduleTick, unscheduleTick } from '@/lib/useSharedTicker';

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  extraScale?: number;
  children?: React.ReactNode;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.0,
  children,
}) => {
  const pathname = usePathname();
  const isMasterPortal = pathname === '/loginmaster' || pathname?.startsWith('/loginmaster/') === true;
  const [lowEnd, setLowEnd] = useState(false);

  // isLowEndDevice() uses browser-only APIs (navigator.hardwareConcurrency).
  // Calling it during SSR would produce a different value than on the client,
  // causing a hydration mismatch. Default to false (render normally) and
  // update only after mount so server and client HTML match.
  useEffect(() => {
    setLowEnd(isLowEndDevice());
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // NOTE: the canvas is FIXED and viewport-sized (see the second resize effect
  // below, which also caches the 2D context). It used to be sized to the parent
  // wrapper — i.e. the FULL PAGE height (~12000px). A layer taller than the
  // GPU max texture size (8192px) cannot be hardware-accelerated, so the whole
  // page fell back to software compositing: ~4 FPS everywhere, worst in the
  // sections with many cards (pricing). Viewport-sized = always GPU-friendly.

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear': return t;
        case 'ease-in': return t * t;
        case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default: return t * (2 - t);
      }
    },
    [easing],
  );

  // Ref-cached values for the stable drawFrame callback (shared ticker).
  const sparkColorRef = useRef(sparkColor);
  sparkColorRef.current = sparkColor;
  const sparkSizeRef = useRef(sparkSize);
  sparkSizeRef.current = sparkSize;
  const sparkRadiusRef = useRef(sparkRadius);
  sparkRadiusRef.current = sparkRadius;
  const extraScaleRef = useRef(extraScale);
  extraScaleRef.current = extraScale;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const easeFuncRef = useRef(easeFunc);
  easeFuncRef.current = easeFunc;

  // Stable draw frame — reads everything from refs, uses performance.now()
  // instead of the rAF timestamp. Auto-stops when no sparks remain.
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const now = performance.now();
    const sparkColor = sparkColorRef.current;
    const sparkSize = sparkSizeRef.current;
    const sparkRadius = sparkRadiusRef.current;
    const extraScale = extraScaleRef.current;
    const duration = durationRef.current;
    const ease = easeFuncRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sparksRef.current = sparksRef.current.filter((spark) => {
      const elapsed = now - spark.startTime;
      if (elapsed >= duration) return false;

      const progress = elapsed / duration;
      const eased = ease(progress);
      const distance = eased * sparkRadius * extraScale;
      const lineLength = sparkSize * (1 - eased);

      const x1 = spark.x + distance * Math.cos(spark.angle);
      const y1 = spark.y + distance * Math.sin(spark.angle);
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      ctx.strokeStyle = sparkColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      return true;
    });

    // Auto-stop: unschedule from shared ticker when no sparks remain
    if (sparksRef.current.length === 0) {
      unscheduleTick(drawFrame);
    }
    // Otherwise stays scheduled — shared ticker calls us again next frame
  }, []);

  // Cache the canvas 2D context on mount + keep the canvas sized to the
  // VIEWPORT (it is position:fixed — see the render below). Sizing it to the
  // parent (full page height, ~12000px) exceeded the GPU max texture size and
  // forced software compositing for the entire page (~4 FPS).
  useEffect(() => {
    if (isMasterPortal || lowEnd) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext('2d');
    if (!ctxRef.current) return;
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    };
    window.addEventListener('resize', handleResize);
    resizeCanvas();
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isMasterPortal, lowEnd]);

  // Click → spark burst, starts the shared-ticker draw loop if idle
  useEffect(() => {
    if (isMasterPortal || lowEnd) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;

    const handleClick = (e: MouseEvent) => {
      // The canvas is fixed at the viewport origin, so client coordinates map
      // 1:1 — no getBoundingClientRect needed (and no layout read per click).
      const x = e.clientX;
      const y = e.clientY;
      const now = performance.now();

      const wasEmpty = sparksRef.current.length === 0;
      const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
        x,
        y,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
      }));
      // Cap total sparks to avoid performance issues during rapid clicks
      const MAX_SPARKS = 64;
      const available = MAX_SPARKS - sparksRef.current.length;
      if (available > 0) {
        sparksRef.current.push(...newSparks.slice(0, available));
      }
      // Kick the shared-ticker draw loop if it's not already running
      if (wasEmpty) scheduleTick(drawFrame, 'ClickSpark');
    };

    parent.addEventListener('click', handleClick);
    return () => {
      parent.removeEventListener('click', handleClick);
      unscheduleTick(drawFrame);
    };
  }, [isMasterPortal, lowEnd, sparkCount, drawFrame]);

  // Keep admin routes and low-end devices completely isolated.
  if (isMasterPortal || lowEnd) return <>{children}</>;

  return (
    <div className="click-spark-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99997,
        }}
      />
      {children}
    </div>
  );
};

export default ClickSpark;
