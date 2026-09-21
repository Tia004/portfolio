'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import BorderGlow from './BorderGlow';
import { t } from '@/lib/translations';
import { useLanguage } from './LanguageProvider';

export interface NavBubbleItem {
  key: string;
  href: string;
  rotation?: number;
}

interface NavBubbleMenuProps {
  items: NavBubbleItem[];
  onNavClick: (href: string) => void;
  closing?: boolean;
}

// ── Single Bubble with Interactive Hover Tilt & Rotation ─────────

function BubbleItem({
  item,
  index,
  onNavClick,
  onMountRef,
  onLabelRef,
}: {
  item: NavBubbleItem;
  index: number;
  onNavClick: (href: string) => void;
  onMountRef: (el: HTMLDivElement | null, i: number) => void;
  onLabelRef: (el: HTMLSpanElement | null, i: number) => void;
}) {
  const { lang } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const baseRotation = isDesktop ? (item.rotation ?? 0) : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isDesktop) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: y * -10, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, active: false });
  };

  // Spuntano già ruotati (baseRotation). Con l'hover si raddrizzano a 0deg (perfettamente orizzontali) con 3D tilt!
  const currentTransform = tilt.active
    ? `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) rotate(0deg) scale3d(1.06, 1.06, 1.06)`
    : `perspective(600px) rotate(${baseRotation}deg) scale3d(1, 1, 1)`;

  return (
    <div
      ref={(el) => {
        cardRef.current = el;
        onMountRef(el, index);
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setTilt((prev) => ({ ...prev, active: true }))}
      onMouseLeave={handleMouseLeave}
      className="bubble-item-wrapper transform-gpu will-change-transform"
      style={{
        transform: currentTransform,
        transition: tilt.active
          ? 'transform 0.12s ease-out'
          : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: '50% 50%',
      }}
    >
      <BorderGlow
        borderRadius={9999}
        glowRadius={35}
        glowIntensity={1.8}
        edgeSensitivity={0}
        glass={true}
        backgroundColor="rgba(8, 20, 16, 0.45)"
        className="rounded-full shadow-xl shadow-black/50"
      >
        <button
          type="button"
          onClick={() => onNavClick(item.href)}
          className="group relative flex items-center justify-center px-7 sm:px-9 md:px-11 py-3.5 sm:py-4.5 md:py-5 rounded-full cursor-pointer select-none transition-all duration-300 w-full min-w-[150px] sm:min-w-[180px] md:min-w-[210px] min-h-[56px] sm:min-h-[66px] md:min-h-[74px] overflow-hidden bg-transparent backdrop-blur-xl focus:outline-none"
          style={{
            boxShadow:
              'inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 0 0 1px rgba(45, 212, 191, 0.08)',
          }}
        >
          {/* Subtle watermark index number in the background with generous breathing room */}
          <span
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center font-sans font-black text-3xl sm:text-4xl md:text-5xl text-white/[0.035] group-hover:text-teal-400/[0.08] transition-colors duration-300 tracking-tight"
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Centered large label text: white -> teal transition */}
          <span
            ref={(el) => onLabelRef(el, index)}
            className="relative z-10 text-center font-black tracking-tight text-white group-hover:text-teal-300 transition-colors duration-300 select-none text-2xl sm:text-3xl md:text-4xl whitespace-nowrap leading-tight"
          >
            {t(`nav.${item.key}`, lang)}
          </span>
        </button>
      </BorderGlow>
    </div>
  );
}

// ── Main NavBubbleMenu with GSAP Entrance & Exit Animations ────────

export default function NavBubbleMenu({ items, onNavClick, closing = false }: NavBubbleMenuProps) {
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const bubbles = bubblesRef.current.filter(Boolean) as HTMLDivElement[];
    const labels = labelsRef.current.filter(Boolean) as HTMLSpanElement[];

    if (!bubbles.length) return;

    if (!closing) {
      // Prevent running the entrance animation more than once to fix the double-pop bug
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      // Entrance: scale 0 -> 1 with back.out(1.5) elastic pop + staggered delays
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.set(bubbles, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(labels, { y: 20, autoAlpha: 0 });

      const tl = gsap.timeline();
      timelineRef.current = tl;

      bubbles.forEach((bubble, i) => {
        const delay = i * 0.07;
        tl.to(
          bubble,
          {
            scale: 1,
            duration: 0.48,
            ease: 'back.out(1.5)',
          },
          delay
        );

        if (labels[i]) {
          tl.to(
            labels[i],
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.4,
              ease: 'power3.out',
            },
            delay + 0.08
          );
        }
      });
    } else {
      // Exit: swift fade and scale down
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.to(labels, {
        y: 16,
        autoAlpha: 0,
        duration: 0.16,
        ease: 'power3.in',
      });
      gsap.to(bubbles, {
        scale: 0,
        duration: 0.18,
        ease: 'power3.in',
      });
    }

    return () => {
      timelineRef.current?.kill();
    };
  }, [closing]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5 max-w-6xl mx-auto w-full px-4 py-2">
      {items.map((item, idx) => (
        <BubbleItem
          key={item.href}
          item={item}
          index={idx}
          onNavClick={onNavClick}
          onMountRef={(el, i) => {
            bubblesRef.current[i] = el;
          }}
          onLabelRef={(el, i) => {
            labelsRef.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}
