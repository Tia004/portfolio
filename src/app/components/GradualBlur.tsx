'use client';

import { useEffect, useRef, useState } from 'react';
import { useLenis } from './SmoothScroll';

export default function GradualBlur() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);
  const { lenis } = useLenis();

  useEffect(() => {
    const instance = lenis.current;

    const update = () => {
      // Use Lenis scroll position if available, fall back to native
      const scrollY = instance?.scroll ?? window.scrollY;
      const scrollBottom = scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const distFromBottom = docHeight - scrollBottom;

      if (distFromBottom <= 0) {
        setOpacity(0);
      } else if (distFromBottom < 150) {
        setOpacity(distFromBottom / 150);
      } else {
        setOpacity(1);
      }
    };

    if (instance) {
      instance.on('scroll', update);
    } else {
      window.addEventListener('scroll', update, { passive: true });
    }
    update();

    return () => {
      if (instance) {
        instance.off('scroll', update);
      } else {
        window.removeEventListener('scroll', update);
      }
    };
  }, [lenis]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-[1000] pointer-events-none"
      style={{
        height: '10rem',
        opacity,
        transition: 'opacity 0.4s ease',
      }}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const progress = (i + 1) / 5;
        const blurVal = Math.pow(2, progress * 3) * 0.0625;
        const p1 = Math.round((20 * i) * 10) / 10;
        const p2 = Math.round((20 * (i + 1)) * 10) / 10;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              maskImage: `linear-gradient(to bottom, transparent ${p1}%, black ${p2}%)`,
              WebkitMaskImage: `linear-gradient(to bottom, transparent ${p1}%, black ${p2}%)`,
              backdropFilter: `blur(${blurVal.toFixed(3)}rem)`,
              WebkitBackdropFilter: `blur(${blurVal.toFixed(3)}rem)`,
              opacity: 1,
            }}
          />
        );
      })}

      {/* Chromatic aberration — red channel shifted left */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'translateX(-2px)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          backdropFilter: 'blur(0.25rem)',
          WebkitBackdropFilter: 'blur(0.25rem)',
          filter: 'grayscale(1) brightness(0.5) sepia(1) saturate(3) hue-rotate(-30deg)',
          WebkitFilter: 'grayscale(1) brightness(0.5) sepia(1) saturate(3) hue-rotate(-30deg)',
          mixBlendMode: 'screen' as React.CSSProperties['mixBlendMode'],
          opacity: 0.5,
        }}
      />

      {/* Chromatic aberration — blue channel shifted right */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'translateX(2px)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          backdropFilter: 'blur(0.25rem)',
          WebkitBackdropFilter: 'blur(0.25rem)',
          filter: 'grayscale(1) brightness(0.5) sepia(1) saturate(3) hue-rotate(200deg)',
          WebkitFilter: 'grayscale(1) brightness(0.5) sepia(1) saturate(3) hue-rotate(200deg)',
          mixBlendMode: 'screen' as React.CSSProperties['mixBlendMode'],
          opacity: 0.5,
        }}
      />
    </div>
  );
}
