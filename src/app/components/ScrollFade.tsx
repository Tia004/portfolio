'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useLenis } from './SmoothScroll';

interface ScrollFadeProps {
  children: ReactNode;
  /** Distance in px from the bottom at which fading begins. Default 300. */
  fadeStart?: number;
  /** Minimum opacity when fully faded. Default 0. */
  minOpacity?: number;
}

/**
 * ScrollFade — fades its children out as the user approaches the bottom of the page.
 * Uses Lenis for smooth scroll tracking.
 */
export default function ScrollFade({
  children,
  fadeStart = 300,
  minOpacity = 0,
}: ScrollFadeProps) {
  const [opacity, setOpacity] = useState(1);
  const { lenis } = useLenis();

  useEffect(() => {
    let instance = lenis.current;

    function setupListener(inst: NonNullable<typeof instance>) {
      const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
        if (limit <= 0) return;
        const distFromBottom = limit - scroll;
        if (distFromBottom <= 0) {
          setOpacity(minOpacity);
        } else if (distFromBottom >= fadeStart) {
          setOpacity(1);
        } else {
          setOpacity(minOpacity + (1 - minOpacity) * (distFromBottom / fadeStart));
        }
      };

      inst.on('scroll', onScroll);
      onScroll({ scroll: inst.scroll, limit: inst.limit });

      return () => {
        inst.off('scroll', onScroll);
      };
    }

    // If Lenis hasn't initialised yet, poll with rAF (lighter than setInterval
    // and auto-paused when the tab is inactive). Time-based deadline ensures
    // consistent ~3 s regardless of display refresh rate.
    if (!instance) {
      let teardown: (() => void) | null = null;
      let frameId = 0;
      const deadline = performance.now() + 3000;
      const poll = () => {
        instance = lenis.current;
        if (instance) {
          teardown = setupListener(instance) ?? null;
          return;
        }
        if (performance.now() < deadline) {
          frameId = requestAnimationFrame(poll);
        }
      };
      frameId = requestAnimationFrame(poll);
      return () => {
        cancelAnimationFrame(frameId);
        teardown?.();
      };
    }

    return setupListener(instance);
  }, [lenis, fadeStart, minOpacity]);

  return (
    <div
      style={{
        opacity,
        transition: 'opacity 0.15s ease-out',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
}
