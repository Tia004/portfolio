'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isProjectHovered, setIsProjectHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Detect touch/mobile pointers
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) {
      return; // Absolute safety fallback for mobile
    }

    setIsVisible(true);

    // Initial position centering
    gsap.set([dotRef.current, blobRef.current], { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

    // GSAP high-performance quickTo bindings
    const xToDot = gsap.quickTo(dotRef.current, 'x', { duration: 0.08, ease: 'power3' });
    const yToDot = gsap.quickTo(dotRef.current, 'y', { duration: 0.08, ease: 'power3' });

    const xToBlob = gsap.quickTo(blobRef.current, 'x', { duration: 0.35, ease: 'power3.out' });
    const yToBlob = gsap.quickTo(blobRef.current, 'y', { duration: 0.35, ease: 'power3.out' });

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let prevX = mouseX;
    let prevY = mouseY;
    let speed = 0;
    let angle = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Direct synchronous update to minimize layout latency
      xToDot(mouseX);
      yToDot(mouseY);
      xToBlob(mouseX);
      yToBlob(mouseY);
    };

    // Event delegation to capture active hovering states dynamically
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if hovered element or its parents are interactive links/buttons
      const interactiveEl = target.closest('a, button, [role="button"], .menu-item-btn, .interactive-hover');
      const projectCard = target.closest('.warp-card');

      if (projectCard) {
        setIsProjectHovered(true);
        setIsHovered(false);
      } else if (interactiveEl) {
        setIsHovered(true);
        setIsProjectHovered(false);
      } else {
        setIsHovered(false);
        setIsProjectHovered(false);
      }
    };

    const handleMouseLeaveWindow = () => {
      // Hide cursor elements cleanly when leaving window viewport
      gsap.to([dotRef.current, blobRef.current], { opacity: 0, duration: 0.3 });
    };

    const handleMouseEnterWindow = () => {
      gsap.to([dotRef.current, blobRef.current], { opacity: 1, duration: 0.2 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    document.addEventListener('mouseenter', handleMouseEnterWindow);

    // Dynamic Squash & Stretch loop driven by GSAP high-precision ticker
    const tick = () => {
      const dx = mouseX - prevX;
      const dy = mouseY - prevY;

      // Calculate instant speed (distance per frame) and apply smooth interpolation filter
      const instantSpeed = Math.sqrt(dx * dx + dy * dy);
      speed += (instantSpeed - speed) * 0.12; // Beautiful elastic inertia damping

      if (instantSpeed > 0.4) {
        angle = Math.atan2(dy, dx);
      }

      // Cap maximum stretch to maintain visual integrity
      const stretch = Math.min(speed * 0.045, 0.55);
      
      // Keep surface area constant (squash along perpendicular axis)
      const scaleX = 1 + stretch;
      const scaleY = 1 - stretch * 0.35;

      gsap.set(blobRef.current, {
        scaleX: scaleX,
        scaleY: scaleY,
        rotation: angle * (180 / Math.PI), // Convert to degrees for GSAP
      });

      prevX = mouseX;
      prevY = mouseY;
    };

    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      document.removeEventListener('mouseenter', handleMouseEnterWindow);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <>
      {/* 1. Fast Tracking Responsive Center Core */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-white z-[99999] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-350 ease-out shadow-[0_0_8px_rgba(255,255,255,0.4)] ${
          !isVisible ? 'opacity-0 scale-0' : isHovered || isProjectHovered ? 'scale-0' : 'scale-100'
        }`}
      />

      {/* 2. Fluid Organic Elastic Outer Blob */}
      <div
        ref={blobRef}
        className={`fixed top-0 left-0 w-8 h-8 rounded-full border pointer-events-none z-[99998] flex items-center justify-center transition-all duration-350 ease-out origin-center ${
          !isVisible
            ? 'opacity-0 scale-0'
            : isProjectHovered
            ? 'w-16 h-16 bg-white border-white scale-100 mix-blend-normal text-black shadow-[0_15px_30px_rgba(255,255,255,0.25)]'
            : isHovered
            ? 'w-14 h-14 bg-white/10 border-white ring-4 ring-white/5 scale-100 mix-blend-difference shadow-[0_0_20px_rgba(255,255,255,0.15)]'
            : 'bg-transparent border-white/40 backdrop-blur-[0.5px] scale-100 mix-blend-difference shadow-[0_0_12px_rgba(255,255,255,0.05)]'
        }`}
      >
        {isVisible && isProjectHovered && (
          <span className="text-[8px] font-mono tracking-widest font-black uppercase text-black scale-90 animate-pulse select-none">
            view
          </span>
        )}
      </div>
    </>
  );
}
