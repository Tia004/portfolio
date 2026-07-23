'use client';

import React, { useState } from 'react';
import BorderGlow from './BorderGlow';

// ── Types ─────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqRow {
  id: string;
  speed: string;
  direction: 'left' | 'right';
  faqItems: FaqItem[];
}

interface FaqScrollerProps {
  mainTitle: string;
  mainSubtitle: string;
  rows: FaqRow[];
}

// Deterministic pseudo-random offset based on string hash
function hashOffset(str: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return ((hash % (range * 2 + 1)) - range);
}

// ── FaqCard ───────────────────────────────────────────────────

function FaqCard({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const offsetY = hashOffset(question, 8);

  return (
    <div style={{ transform: `translateY(${offsetY}px)` }}>
    <BorderGlow
      continuousHover
      borderRadius={20}
      glowRadius={30}
      glowIntensity={2.0}
      className="w-[300px] sm:w-[360px] flex-shrink-0"
      edgeSensitivity={0}
    >
      <div
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); }}}
        role="button"
        tabIndex={0}
        className={`
          group flex flex-col items-start cursor-pointer select-none
          p-5 sm:p-6
          ${open ? '' : ''}
        `}
      >
        <div className="flex items-start justify-between w-full gap-3">
          <h3 className={`
            text-sm sm:text-[15px] font-semibold leading-snug transition-colors duration-300
            ${open ? 'text-teal-400' : 'text-white group-hover:text-neutral-200'}
          `}>
            {question}
          </h3>
          <svg
            className={`
              w-5 h-5 shrink-0 mt-0.5 transition-all duration-400 ease-out
              ${open ? 'rotate-180 text-teal-400' : 'text-neutral-600 group-hover:text-neutral-400'}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div
          className={`
            grid transition-all duration-400 ease-out
            ${open ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] mt-0 opacity-0'}
          `}
        >
          <div className="overflow-hidden">
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </BorderGlow>
    </div>
  );
}

// ── HorizontalScroller ────────────────────────────────────────

function HorizontalScroller({
  children,
  speed = '60s',
  direction = 'left',
}: {
  children: React.ReactNode;
  speed?: string;
  direction?: 'left' | 'right';
}) {
  const animationClass =
    direction === 'right' ? 'animate-scroll-horizontal-reverse' : 'animate-scroll-horizontal';

  return (
    <div className="w-full overflow-hidden relative py-10 scroller-mask">
      {/* fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 z-10 pointer-events-none bg-gradient-to-r from-[#050505] to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 z-10 pointer-events-none bg-gradient-to-r from-transparent to-[#050505]" />

      <div
        className={`flex ${animationClass} hover:[animation-play-state:paused]`}
        style={{ '--scroll-duration': speed } as React.CSSProperties}
      >
        <div className="flex items-start justify-center flex-shrink-0 gap-4 sm:gap-6 px-2 sm:px-4">
          {children}
        </div>
        {/* duplicate for seamless loop */}
        <div className="flex items-start justify-center flex-shrink-0 gap-4 sm:gap-6 px-2 sm:px-4" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── FaqSection ────────────────────────────────────────────────

export default function FaqScroller({ mainTitle, mainSubtitle, rows }: FaqScrollerProps) {
  return (
    <section id="faq" className="py-24 px-4 bg-[#050505]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Dubbi?</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{mainTitle}</h2>
          <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            {mainSubtitle}
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {rows.map((row) => (
            <HorizontalScroller key={row.id} speed={row.speed} direction={row.direction}>
              {row.faqItems.map((item) => (
                <FaqCard key={item.id} question={item.question} answer={item.answer} />
              ))}
            </HorizontalScroller>
          ))}
        </div>
      </div>
    </section>
  );
}
