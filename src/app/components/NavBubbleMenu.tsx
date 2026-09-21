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

// ── Single Bubble with 3D Tilt and Liquid Glass BorderGlow ─────────

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
    setTilt({ x: x * 12, y: y * -12, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, active: false });
  };

  const currentTransform = tilt.active
    ? `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) rotate(${baseRotation * 0.3}deg) scale3d(1.06, 1.06, 1.06)`
    : `perspective(600px) rotate(${baseRotation}deg) scale3d(1, 1, 1)`;

  return (
    <div
      ref={(el) => {
        cardRef.current = el;
        onMountRef(el, index);
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="bubble-item-wrapper transform-gpu will-change-transform"
      style={{
        transform: currentTransform,
        transition: tilt.active ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: '50% 50%',
      }}
    >
      <BorderGlow
        borderRadius={9999}
        glowColor="168 84% 50%"
        glowRadius={40}
        glowIntensity={1.2}
        coneSpread={8}
        glass={true}
        singleBeam={true}
        className="rounded-full shadow-lg shadow-black/40 overflow-hidden"
      >
        <button
          type="button"
          onClick={() => onNavClick(item.href)}
          className="group relative flex items-center justify-center gap-2.5 sm:gap-3.5 px-5 sm:px-8 py-2.5 sm:py-3.5 md:py-4 rounded-full cursor-pointer select-none transition-all duration-300 w-full"
          style={{
            background: 'rgba(8, 20, 16, 0.72)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 0 0 1px rgba(45, 212, 191, 0.08)',
          }}
        >
          {/* Index pill badge */}
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-teal-400/70 group-hover:text-teal-300 group-hover:scale-110 group-hover:border-teal-400/40 px-2 py-0.5 rounded-full bg-teal-950/40 border border-teal-500/20 transition-all duration-300 shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Label text: white -> teal transition */}
          <span
            ref={(el) => onLabelRef(el, index)}
            className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-white group-hover:text-teal-300 transition-colors duration-300 whitespace-nowrap"
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

  useEffect(() => {
    const bubbles = bubblesRef.current.filter(Boolean) as HTMLDivElement[];
    const labels = labelsRef.current.filter(Boolean) as HTMLSpanElement[];

    if (!bubbles.length) return;

    if (!closing) {
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
  }, [closing, items]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5 max-w-4xl mx-auto w-full px-4 py-2">
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
