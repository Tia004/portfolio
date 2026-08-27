'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { scheduleTick, unscheduleTick } from '@/lib/useSharedTicker';

/**
 * Shared service-card interaction wrapper. It pre-mounts the canvas near the
 * viewport and reveals it on hover, or immediately on touch devices.
 */
export function DotGridCard({
  children,
  className = '',
}: {
  children: (mounted: boolean, fadeIn: boolean) => ReactNode;
  className?: string;
}) {
  const [viewportMounted, setViewportMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const mounted = viewportMounted || hovered;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef(false);

  const enter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(true);
    if (!fadeIn) setFadeIn(true);
  }, [fadeIn]);

  const leave = useCallback(() => {
    if (touchRef.current) return;
    setHovered(false);
    setFadeIn(false);
    if (!viewportMounted) {
      timerRef.current = setTimeout(() => {
        setHovered(false);
        setFadeIn(false);
      }, 30_000);
    }
  }, [viewportMounted]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (window.matchMedia('(hover: none)').matches) touchRef.current = true;
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setViewportMounted(true);
      if (touchRef.current) setFadeIn(true);
      io.disconnect();
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (wrapperRef.current?.matches(':hover')) {
      setHovered(true);
      setFadeIn(true);
    }
  }, []);

  return (
    <div ref={wrapperRef} onMouseEnter={enter} onMouseLeave={leave} className={`h-full ${className}`}>
      {children(mounted, fadeIn)}
    </div>
  );
}

/** Shared mouse-only 3D interaction used by the services cards. */
export function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const canTiltRef = useRef(false);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const syncMotionPreference = () => {
      canTiltRef.current = media.matches;
      if (!media.matches && tiltRef.current) {
        tiltRef.current.style.transform = 'none';
        tiltRef.current.style.willChange = 'auto';
        activeRef.current = false;
      }
    };
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (!entry.isIntersecting && tiltRef.current) {
          tiltRef.current.style.transform = 'none';
          tiltRef.current.style.willChange = 'auto';
          activeRef.current = false;
        }
      },
      { rootMargin: '150px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const tiltScheduledRef = useRef(false);
  const paintTiltRef = useRef<() => void>(() => {});

  const paintTilt = useCallback(() => {
    tiltScheduledRef.current = false;
    unscheduleTick(paintTiltRef.current);
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    const layout = layoutRef.current;
    const tilt = tiltRef.current;
    if (!pending || !layout || !tilt || !isVisibleRef.current || !canTiltRef.current) return;
    const rect = layout.getBoundingClientRect();
    const x = (pending.x - rect.left) / rect.width - 0.5;
    const y = (pending.y - rect.top) / rect.height - 0.5;
    tilt.style.willChange = 'transform';
    tilt.style.transform = `perspective(800px) rotateX(${y * -10}deg) rotateY(${x * 10}deg) scale3d(1.02,1.02,1)`;
    if (!activeRef.current) {
      activeRef.current = true;
      setActive(true);
    }
  }, []);

  useEffect(() => {
    paintTiltRef.current = paintTilt;
  }, [paintTilt]);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isVisibleRef.current || !canTiltRef.current) return;
    pendingMoveRef.current = { x: event.clientX, y: event.clientY };
    if (!tiltScheduledRef.current) {
      tiltScheduledRef.current = true;
      scheduleTick(paintTilt, 'TiltCard');
    }
  };

  const handleMouseLeave = () => {
    pendingMoveRef.current = null;
    if (tiltScheduledRef.current) {
      tiltScheduledRef.current = false;
      unscheduleTick(paintTilt);
    }
    if (!tiltRef.current || !canTiltRef.current) return;
    tiltRef.current.style.transform = 'none';
    tiltRef.current.style.willChange = 'auto';
    activeRef.current = false;
    setActive(false);
  };

  useEffect(() => () => {
    if (tiltScheduledRef.current) {
      tiltScheduledRef.current = false;
      unscheduleTick(paintTilt);
    }
  }, [paintTilt]);

  return (
    <div
      ref={layoutRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ zIndex: active ? 10 : 1 }}
    >
      <div
        ref={tiltRef}
        // h-full: without it this wrapper breaks the percentage-height chain
        // from the stretched grid item to the card content — shorter cards
        // (e.g. base price tiers) stayed at their natural height instead of
        // stretching to the tallest card in the row.
        className="h-full"
        style={{
          transition: active ? 'none' : 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          transformStyle: 'preserve-3d',
          willChange: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
