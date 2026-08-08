'use client';

import React, { useId, useState } from 'react';
import BorderGlow from './BorderGlow';
import InfiniteSlider from './InfiniteSlider';

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

function FaqCard({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const answerId = `faq-answer-${useId().replace(/:/g, '')}`;

  return (
    <div
      onClick={onToggle}
      className="relative flex h-fit flex-shrink-0 self-start items-start z-0 hover:z-20 faq-card-lift transition-all duration-300 ease-out cursor-pointer"
      style={{ transitionProperty: 'box-shadow, transform' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      aria-expanded={isOpen}
      aria-controls={answerId}
    >
      <BorderGlow
        continuousHover
        borderRadius={20}
        glowRadius={30}
        glowIntensity={2}
        backgroundColor="#050505"
        className="h-fit w-[min(360px,calc(100vw-2rem))] self-start"
        edgeSensitivity={0}
      >
        <div
          className={`group flex w-full justify-between gap-3 select-none px-5 text-left sm:px-6 transition-[padding,height,min-height] duration-400 ease-out ${isOpen ? 'items-start py-[clamp(0.6rem,1.35vw,0.8rem)] h-fit min-h-0' : 'items-center py-[clamp(0.35rem,0.7vw,0.5rem)] h-[clamp(3rem,4.7vw,3.5rem)]'}`}
        >
          <span className={`text-sm sm:text-[15px] font-semibold leading-snug transition-colors duration-300 ${isOpen ? 'text-teal-400' : 'text-white group-hover:text-neutral-200'}`}>
            {question}
          </span>
          <svg
            aria-hidden="true"
            className={`w-5 h-5 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${isOpen ? 'rotate-180 text-teal-400' : 'text-neutral-600 group-hover:text-neutral-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div
          id={answerId}
          role="region"
          aria-hidden={!isOpen}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="min-h-0 overflow-hidden px-5 sm:px-6">
            <p className="border-t border-white/[0.06] pt-4 pb-5 sm:pb-6 text-xs leading-relaxed text-neutral-400 sm:text-sm">
              {answer}
            </p>
          </div>
        </div>
      </BorderGlow>
    </div>
  );
}

function FaqScrollerMarquee({
  items,
  speed = '60s',
  direction = 'left',
}: {
  items: FaqItem[];
  speed?: string;
  direction?: 'left' | 'right';
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const duration = Number.parseFloat(speed) || 60;

  return (
    <div className={`relative w-full ${openId ? 'z-20' : 'z-0'}`}>
      {/* The track remains vertically visible so the inline accordion can expand
       * without being cropped by a scroll container or compositor layer. */}
      <div className="faq-marquee-viewport relative overflow-visible py-[1vh]">
        {/* Keep the glow paintable: CSS masks clip BorderGlow's halo even
            when every overflow property is visible. These overlays preserve
            the horizontal fade without clipping the card compositor layer. */}
        {/* Wide opaque side curtains: hide the duplicated cards at the edges
            while leaving a centered, fully readable window. */}
        <div
          aria-hidden="true"
          className="marquee-edge-curtain marquee-edge-curtain--left"
          style={{ '--marquee-edge-bg': '#050505', '--marquee-edge-fade': 'rgba(5, 5, 5, 0.86)' } as React.CSSProperties}
        />
        <div
          aria-hidden="true"
          className="marquee-edge-curtain marquee-edge-curtain--right"
          style={{ '--marquee-edge-bg': '#050505', '--marquee-edge-fade': 'rgba(5, 5, 5, 0.86)' } as React.CSSProperties}
        />
        <InfiniteSlider
          className="faq-slider"
          gap={16}
          duration={duration}
          durationOnHover={Math.max(1, Math.round(duration * 0.45))}
          reverse={direction === 'right'}
          overflowY="visible"
        >
          {items.map((item) => (
            <FaqCard
              key={item.id}
              question={item.question}
              answer={item.answer}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </InfiniteSlider>
      </div>

    </div>
  );
}

export default function FaqScroller({ mainTitle, mainSubtitle, rows }: FaqScrollerProps) {
  return (
    <section id="faq" className="bg-[#050505] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-teal-400">Dubbi?</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">{mainTitle}</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-400 sm:text-base">{mainSubtitle}</p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          {rows.map((row: FaqRow) => (
            <FaqScrollerMarquee
              key={row.id}
              speed={row.speed}
              direction={row.direction}
              items={row.faqItems}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
