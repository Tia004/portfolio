'use client';

import React, { useLayoutEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FOOTER } from '@/lib/animation-theme';
import { SECTION_OFFSETS } from '@/lib/animation-theme';
import { type Lang, t } from '@/lib/translations';
import { useLenis } from './SmoothScroll';
import { scrollToElementAfterLayout, triggerArrivalGlow } from '@/lib/scroll';

/**
 * FooterAnimation — split-text rising wordmark + gradient glow
 * Splits "Tia Designs" into individual <span>s via innerHTML in
 * useLayoutEffect (before paint), then animates each character with
 * GSAP ScrollTrigger as the footer enters the viewport.
 * A CSS .gsap-revealed class locks visibility post-animation so HMR /
 * re-renders can't wipe the text.
 */
export default function FooterAnimation({ lang, onOpenLegal }: { lang: Lang; onOpenLegal?: (doc: string) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { lenis } = useLenis();

  // Intercept internal section links — use the shared scroll system with arrival glow
  const handleSectionClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const sectionId = href.replace(/^#/, '');
    scrollToElementAfterLayout(href, () => lenis.current, {
      offsetPx: SECTION_OFFSETS[sectionId] ?? 0,
      onComplete: () => triggerArrivalGlow(sectionId),
    });
  }, [lenis]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const wordmark = wordmarkRef.current;
    const glow = glowRef.current;
    if (!section || !wordmark || !glow) return;

    // Split "Tia Designs" into individual characters
    const text = 'Tia Designs';
    wordmark.innerHTML = '';
    text.split('').forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.className = 'footer-char';
      span.setAttribute('data-footer-char', '');
      span.style.display = 'inline-block';
      // Start fully hidden — GSAP scrub will reveal proportionally
      span.style.opacity = '0';
      span.style.transform = `translateY(${FOOTER.chars.yOffset}px) rotateX(${FOOTER.chars.rotateX}deg)`;
      wordmark.appendChild(span);
    });

    const charEls = wordmark.querySelectorAll<HTMLSpanElement>('[data-footer-char]');
    const content = contentRef.current;

    const ctx = gsap.context(() => {
      // Parallax: content rises + scales up as the footer enters the viewport
      if (content) {
        gsap.fromTo(
          content,
          { y: FOOTER.contentParallax.yOffset, scale: FOOTER.contentParallax.scale },
          {
            y: 0,
            scale: 1,
            ease: FOOTER.contentParallax.ease,
            scrollTrigger: {
              trigger: section,
              start: FOOTER.contentParallax.start,
              end: FOOTER.contentParallax.end,
              scrub: FOOTER.contentParallax.scrub,
            },
          }
        );
      }

      // Gradient glow: shift position on scroll
      gsap.to(glow, {
        backgroundPosition: '50% 100%',
        ease: FOOTER.glow.ease,
        scrollTrigger: {
          trigger: section,
          start: FOOTER.glow.start,
          end: FOOTER.glow.end,
          scrub: FOOTER.glow.scrub,
        },
      });

      // ── Scroll-driven character reveal ──────────────────────
      // Each character animates from hidden (y:80, opacity:0, rotateX:-15)
      // to fully visible (y:0, opacity:1, rotateX:0) proportionally to
      // the scroll position.  Scroll down → characters rise; scroll up →
      // they sink back.  The stagger distributes each character's progress
      // across the scroll range for a cascading wave effect.
      gsap.fromTo(charEls,
        { y: FOOTER.chars.yOffset, opacity: 0, rotateX: FOOTER.chars.rotateX },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          stagger: FOOTER.chars.stagger,
          ease: FOOTER.chars.ease,
          scrollTrigger: {
            trigger: section,
            start: FOOTER.chars.start,
            end: FOOTER.chars.end,
            scrub: FOOTER.chars.scrub,
          },
        }
      );

      // Refresh ScrollTrigger now that the chars are in the DOM
      ScrollTrigger.refresh();
    }, section);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <footer ref={sectionRef} className="relative bg-[#050505] text-white py-16 sm:py-24 px-4 border-t border-white/5 overflow-hidden">
      {/* Gradient glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(45, 212, 191, 0.12) 0%, transparent 60%)',
          backgroundSize: '100% 200%',
          backgroundPosition: '50% 0%',
        }}
      />

      {/* Rising wordmark — maximalist: spans full viewport width.
          Chars are injected via innerHTML in useLayoutEffect above. */}
      <div
        ref={wordmarkRef}
        className="text-[13vw] sm:text-[13vw] md:text-[14vw] font-black tracking-[-0.02em] text-white text-center mb-8 sm:mb-12 leading-[0.85] px-2 select-none w-full overflow-hidden"
        style={{ perspective: '800px' }}
      />

      <div ref={contentRef} className="relative z-10 max-w-6xl mx-auto">
        {/* Sub-footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <picture>
              <source srcSet="/TiaDesignsLogo.avif" type="image/avif" />
              <source srcSet="/TiaDesignsLogo.webp" type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/TiaDesignsLogo.png" alt="Tia Designs" loading="lazy" className="h-8 w-auto mb-4 brightness-0 invert select-none" draggable="false" />
            </picture>
            <p className="text-neutral-400 text-xs leading-relaxed max-w-xs">
              {t('footer.desc', lang)}
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">{t('footer.servizi', lang)}</h4>
            <ul className="space-y-2">
              {[
                { key: 'footer.uxui', href: '#servizi' },
                { key: 'footer.sviluppo_app', href: '#servizi' },
                { key: 'footer.sviluppo_software', href: '#servizi' },
                { key: 'footer.video_making', href: '#servizi' },
                { key: 'footer.consulenza', href: '#servizi' },
              ].map(({ key, href }) => (
                <li key={key}><a href={href} onClick={(e) => handleSectionClick(e, href)} className="text-neutral-400 hover:text-white transition-colors text-xs">{t(key, lang)}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">{t('footer.links', lang)}</h4>
            <ul className="space-y-2">
              {[
                { key: 'footer.progetti', href: '#progetti' },
                { key: 'footer.prezzi', href: '#prezzi' },
                { key: 'footer.recensioni', href: '#recensioni' },
                { key: 'footer.faq_link', href: '#faq' },
                { key: 'footer.contatti', href: '#contatti' },
              ].map(({ key, href }) => (
                <li key={key}><a href={href} onClick={(e) => handleSectionClick(e, href)} className="text-neutral-400 hover:text-white transition-colors text-xs">{t(key, lang)}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">{t('footer.contatti', lang)}</h4>
            <ul className="space-y-2 text-neutral-400 text-xs">
              <li>{t('footer.location', lang)}</li>
              <li><a href="mailto:info@tiadesigns.it" className="hover:text-white transition-colors">info@tiadesigns.it</a></li>
              <li><a href="tel:+393318821334" className="hover:text-white transition-colors">+39 331 882 1334</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 sm:pt-8 flex flex-col items-center gap-3">
          <p className="text-neutral-500 text-xs">{t('footer.copyright', lang)}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-neutral-500 text-xs">
            {onOpenLegal && (
              <>
                <button onClick={() => onOpenLegal('privacy')} className="hover:text-white transition-colors" aria-label={t('footer.privacy', lang)}>{t('footer.privacy', lang)}</button>
                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                <button onClick={() => onOpenLegal('cookies')} className="hover:text-white transition-colors" aria-label={t('footer.cookie', lang)}>{t('footer.cookie', lang)}</button>
                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                <button onClick={() => onOpenLegal('terms')} className="hover:text-white transition-colors" aria-label={t('footer.termini', lang)}>{t('footer.termini', lang)}</button>
                <span className="w-1 h-1 rounded-full bg-neutral-600" />
              </>
            )}
            <button
              onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
              className="hover:text-white transition-colors"
              aria-label={t('footer.cookie_prefs', lang)}
            >
              {t('footer.cookie_prefs', lang)}
            </button>
            <span className="w-1 h-1 rounded-full bg-neutral-500" />
            <span>{t('footer.location', lang)}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-500" />
            <span>{t('footer.timezone', lang)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
