'use client';

import { useEffect, useState, useRef } from 'react';

export default function FluidGlassCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isTouch = useRef(false);

  useEffect(() => {
    // Skip on touch devices
    isTouch.current = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch.current) return;

    setIsVisible(true);

    let rafId: number;
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;

    const move = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const hover = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('a, button, [role="button"], input, select, textarea, .pointer-events-auto');
      setIsHovered(!!interactive);
    };

    const leave = () => setIsVisible(false);
    const enter = () => setIsVisible(true);

    const tick = () => {
      // Smooth follow with 0.12 lerp factor
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      setPos({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', hover);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', hover);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
    };
  }, []);

  if (isTouch.current) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
        width: isHovered ? 52 : 36,
        height: isHovered ? 52 : 36,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: isVisible ? 1 : 0,
        backdropFilter: 'blur(5px) saturate(120%)',
        WebkitBackdropFilter: 'blur(5px) saturate(120%)',
        border: '1.5px solid rgba(255, 255, 255, 0.18)',
        background: 'radial-gradient(circle at center, rgba(45, 212, 191, 0.08) 0%, rgba(45, 212, 191, 0.03) 50%, transparent 100%)',
        boxShadow: '0 0 20px rgba(45, 212, 191, 0.06), inset 0 0 10px rgba(255, 255, 255, 0.03)',
        transition: `width 0.22s cubic-bezier(0.16, 1, 0.3, 1), height 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, border-color 0.22s ease, background 0.22s ease`,
      }}
    />
  );
}
