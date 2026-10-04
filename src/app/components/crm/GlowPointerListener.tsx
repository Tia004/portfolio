'use client';

import { useEffect } from 'react';

export function GlowPointerListener() {
  useEffect(() => {
    let activeCard: HTMLElement | null = null;
    let ticking = false;

    const selector =
      '.bg-surface-container-lowest, .bg-surface-container-low, .settings-card, .auth-panel, .theme-choice, .app-card, .resend-card, .kpi-card, .focus-queues, .focus-results, section.bg-surface-container-lowest';

    const handlePointerMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest(selector) as HTMLElement | null;

      if (activeCard && activeCard !== target) {
        activeCard.style.setProperty('--glow-x', '50%');
        activeCard.style.setProperty('--glow-y', '0%');
      }

      if (!target) {
        activeCard = null;
        return;
      }

      activeCard = target;

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          if (!activeCard) return;
          const rect = activeCard.getBoundingClientRect();
          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
          activeCard.style.setProperty('--glow-x', `${x}%`);
          activeCard.style.setProperty('--glow-y', `${y}%`);
        });
      }
    };

    const handlePointerLeave = () => {
      if (activeCard) {
        activeCard.style.setProperty('--glow-x', '50%');
        activeCard.style.setProperty('--glow-y', '0%');
        activeCard = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  return null;
}
