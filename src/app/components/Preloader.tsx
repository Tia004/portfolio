'use client';

import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Elegant entrance floating animation for the orb and logo
    gsap.fromTo(logoRef.current, 
      { scale: 0.8, opacity: 0, y: 15 },
      { scale: 1, opacity: 1, y: 0, duration: 1.8, ease: 'power4.out' }
    );

    // Staggered text entrance
    const textElements = contentRef.current?.querySelectorAll('.fade-in-text');
    if (textElements) {
      gsap.fromTo(textElements,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out', delay: 0.3 }
      );
    }
  }, []);

  const handleEntry = () => {
    if (isExiting) return;
    setIsExiting(true);

    const tl = gsap.timeline({
      onComplete: onComplete
    });

    // Content fade out and scale down
    tl.to(contentRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.6,
      ease: 'power3.inOut'
    });

    // Logo orb expand and fade
    tl.to(logoRef.current, {
      scale: 1.2,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.inOut'
    }, '-=0.4');

    // Solid curtain slide-up
    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 0.85,
      ease: 'power4.inOut'
    }, '-=0.5');
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#000000] z-[9999] flex flex-col items-center justify-center select-none"
    >
      <div 
        ref={contentRef} 
        className="flex flex-col items-center justify-center px-6 max-w-md w-full"
      >
        {/* Floating Green-Teal Metallic Glass Orb for the user's logo */}
        <div 
          ref={logoRef}
          className="relative w-36 h-36 flex items-center justify-center rounded-full bg-gradient-to-b from-neutral-900 to-black border border-white/15 shadow-[0_0_60px_rgba(16,185,129,0.15),inset_0_2px_4px_rgba(255,255,255,0.1)] group overflow-hidden mb-10"
        >
          {/* Internal rotating ambient light gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-teal-500/15 to-transparent opacity-90 group-hover:rotate-180 transition-transform duration-1000 ease-in-out"></div>
          
          {/* Luminous slow pulse backdrop glow */}
          <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 blur-xl animate-pulse"></div>
          
          {/* Subtle green glass reflections */}
          <div className="absolute top-1 left-4 right-4 h-1/3 rounded-full bg-gradient-to-b from-white/10 to-transparent blur-[1px]"></div>
          
          {/* Specular outer ring */}
          <div className="absolute inset-2.5 rounded-full border border-white/5 bg-black/40 backdrop-blur-sm z-5"></div>

          {/* Luminous Pure White Frosted Glass backing for the logo */}
          <div className="absolute w-20 h-20 rounded-full bg-white/95 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.95),inset_0_2px_5px_rgba(255,255,255,1),0_8px_16px_rgba(0,0,0,0.3)] z-10 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105">
            <img
              src="/TiaDesignsLogo.png"
              alt="Tia Designs"
              className="w-12 h-12 object-contain relative z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] hover:scale-110 transition-transform duration-300"
              draggable="false"
            />
            {/* Glossy lens reflection overlay on the white backing */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"></div>
          </div>
        </div>

        {/* Studio Subtitles */}
        <div className="text-center space-y-2 mb-12">
          <h2 className="fade-in-text text-xl font-bold tracking-tight text-white uppercase text-sans">
            Tia Designs
          </h2>
          <p className="fade-in-text text-xs text-neutral-300 font-light tracking-wider lowercase">
            motion & sound designer
          </p>
          <p className="fade-in-text text-[10px] text-neutral-400 font-light tracking-widest uppercase">
            based in milan
          </p>
        </div>

        {/* Sleek Apple Capsule buttons */}
        <div className="flex flex-col items-center gap-5 w-full">
          <button
            onClick={handleEntry}
            className="fade-in-text w-full max-w-[240px] bg-white text-black text-xs font-semibold py-3.5 rounded-full hover:scale-105 active:scale-98 transition-all duration-300 shadow-[0_10px_20px_rgba(255,255,255,0.05)] cursor-pointer tracking-wider"
          >
            enter with sound •
          </button>
          
          <button
            onClick={handleEntry}
            className="fade-in-text text-[10px] text-neutral-400 hover:text-white transition-colors duration-300 cursor-pointer tracking-widest uppercase mt-1"
          >
            enter without sound
          </button>
        </div>
      </div>
    </div>
  );
}
