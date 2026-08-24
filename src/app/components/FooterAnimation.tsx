'use client';

import React, { useLayoutEffect, useRef, useCallback } from 'react';
import { loadGsap } from '@/lib/gsap-lazy';
import { FOOTER } from '@/lib/animation-theme';
import { SECTION_OFFSETS } from '@/lib/animation-theme';
import { type Lang, t } from '@/lib/translations';
import { CHAT_CATEGORY_OPTIONS, type ChatCategory } from '@/lib/chat-categories';
import { useLenis } from './SmoothScroll';
import { scrollToElementAfterLayout, triggerArrivalGlow } from '@/lib/scroll';

/**
 * FooterAnimation — split-text rising wordmark + gradient glow
 * Splits "Tia Designs" into individual <span>s via innerHTML in
 * useLayoutEffect (before paint).
 *
 * The character reveal is DETERMINISTIC and position-driven: every rAF it
 * measures the wordmark's REAL position in the viewport and maps it to
 * progress (top at 95% of the viewport → start, top at 35% → done), then
 * distributes a left→right cascade across the 11 chars. No cached
 * ScrollTrigger start/end, no refresh(), no failsafe — the page height
 * keeps changing while lazy sections mount, which is exactly what broke
 * the old scrub (stale positions → chars revealed in the wrong order,
 * flickering between the failsafe and the scrub, or static at progress 1).
 * Measuring live every frame can never go stale, and the reveal always
 * plays in order as the user scrolls.
 *
 * The gradient glow + content parallax keep their GSAP scrub (subtle; if
 * positions drift they simply sit at the final state — visually fine).
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
      // Start fully hidden — the position-driven reveal shows them
      span.style.opacity = '0';
      span.style.transform = `translateY(${FOOTER.chars.yOffset}px) rotateX(${FOOTER.chars.rotateX}deg)`;
      wordmark.appendChild(span);
    });

    const charEls = wordmark.querySelectorAll<HTMLSpanElement>('[data-footer-char]');
    const charCount = charEls.length;
    const content = contentRef.current;

    // ── Fit the wordmark to the full viewport width ────────────
    // Runs FIRST, before any GSAP work: in the field the wordmark shipped at
    // the small CSS default, so the fit was clearly not applying on some
    // setups — an exception later in this effect must never be able to block
    // the sizing. Measure the natural text width at a reference font size and
    // scale the size so the rendered text fills the content box (viewport
    // minus the 2vw side paddings) — and NEVER smaller than the fixed CSS
    // sizes it replaces (13vw mobile / 15vw desktop), so the fit only ever
    // enlarges. line-height:1 + no overflow-hidden: descenders (the "g" in
    // Designs) are never clipped.
    const hPadding = () => {
      const cs = getComputedStyle(wordmark);
      return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    };
    // Measure the pure text width at a reference size INDEPENDENT of the
    // container: measuring in place with scrollWidth fails on wide screens —
    // when the container is wider than the text at 100px there is no overflow
    // and scrollWidth collapses to clientWidth, yielding a fit of ~100px (the
    // "wordmark got smaller on desktop" bug). A detached clone is never
    // constrained by the container, so the fit is always correct.
    const measureNaturalWidth = () => {
      const tmp = document.createElement('div');
      tmp.style.cssText =
        'position:absolute;left:-99999px;top:0;visibility:hidden;white-space:nowrap;' +
        'font:900 100px Outfit, ui-sans-serif, system-ui, sans-serif;letter-spacing:-0.02em;';
      tmp.textContent = 'Tia\u00A0Designs';
      document.body.appendChild(tmp);
      const w = tmp.getBoundingClientRect().width;
      document.body.removeChild(tmp);
      return w;
    };
    const fitWordmark = () => {
      if (!wordmark || charEls.length === 0) return;
      try {
        const natural = measureNaturalWidth();
        // Prefer the real content-box width; if the element has no layout yet
        // (clientWidth 0), fall back to the viewport width minus the 2vw side
        // paddings so the wordmark is still sized maximally.
        const box = wordmark.clientWidth > 0 ? wordmark.clientWidth : window.innerWidth;
        const target = box - hPadding(); // content-box width
        const floor = window.innerWidth * (window.innerWidth < 768 ? 0.13 : 0.15);
        if (natural > 0 && target > 0) {
          const fit = Math.round((target / natural) * 100);
          wordmark.style.fontSize = `${Math.max(fit, Math.round(floor))}px`;
        }
      } catch {
        // Never let sizing break the footer.
      }
    };
    fitWordmark();

    // ── Deterministic position-driven character reveal ────────
    // The wordmark's top edge maps to progress: at 95% of the viewport
    // height the reveal starts, at 35% it's complete (matches the old
    // 'top 75%' → 'top 35%' scrub range, plus a small lead-in). Char i
    // enters in a cascading window so the letters rise left→right.
    // Measured from getBoundingClientRect() EVERY frame: the page grows
    // while lazy sections mount, but this never goes stale.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const STAGGER = FOOTER.chars.stagger; // 0.04
    const revealStart = 0.95;
    const revealEnd = 0.35;
    const cascadeSpan = 1 - STAGGER * (charCount - 1);
    let lastP = -1;

    const applyChars = () => {
      if (charCount === 0) return;
      const r = wordmark.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.max(0, Math.min(1, (vh * revealStart - r.top) / (vh * (revealStart - revealEnd))));
      if (p === lastP) return; // no movement — skip the DOM writes
      lastP = p;
      for (let i = 0; i < charCount; i++) {
        const cp = Math.max(0, Math.min(1, (p - i * STAGGER) / cascadeSpan));
        const c = charEls[i];
        c.style.opacity = cp.toFixed(3);
        c.style.transform = `translateY(${(1 - cp) * FOOTER.chars.yOffset}px) rotateX(${(1 - cp) * FOOTER.chars.rotateX}deg)`;
      }
    };

    // IO gates the rAF loop: runs only while the footer is within ~1.5
    // viewports below the viewport, idle everywhere else (zero cost at the
    // top of the page). The loop reads the real position each frame, so it
    // works even if Lenis/scroll events are momentarily janky.
    let raf = 0;
    let inZone = false;
    const loop = () => {
      raf = 0;
      if (!inZone) return;
      applyChars();
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (inZone) return;
      inZone = true;
      applyChars();
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      inZone = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    if (reducedMotion) {
      charEls.forEach((c) => {
        c.style.opacity = '1';
        c.style.transform = 'translateY(0) rotateX(0)';
      });
    } else {
      const approachIO = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) startLoop();
          else stopLoop();
        },
        { rootMargin: '0px 0px 150% 0px', threshold: 0 }
      );
      approachIO.observe(section);
      applyChars();

      // ── Gradient glow + content parallax (GSAP scrub) ─────────
      // Subtle effects; if their trigger positions drift they simply sit at
      // the final state — visually indistinguishable from correct.
      let ctx: { revert: () => void } | null = null;
      let alive = true;
      loadGsap().then((gsap) => {
        if (!alive) return;
        try {
          ctx = gsap.context(() => {
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
          }, section);
        } catch (err) {
          console.error('[footer] GSAP init fallito:', err);
        }
      });

      // Refit on any container resize (orientation change on phones) —
      // rAF-throttled.
      let resizeRaf = 0;
      const onResize = () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          fitWordmark();
          applyChars();
        });
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(wordmark);

      return () => {
        alive = false;
        ctx?.revert();
        approachIO.disconnect();
        ro.disconnect();
        stopLoop();
      };
    }
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

      {/* Rising wordmark — maximalist: spans the full viewport width with
          2vw whitespace on each side, sized by fitWordmark() above so it's
          always as large as possible without clipping. line-height:1 and NO
          overflow-hidden: the "g" descender is never cut. Chars are injected
          via innerHTML in useLayoutEffect above. */}
      <div
        ref={wordmarkRef}
        className="text-[13vw] sm:text-[14vw] md:text-[15vw] font-black tracking-[-0.02em] text-white text-center mb-8 sm:mb-12 leading-none px-[2vw] select-none w-full whitespace-nowrap"
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
              {CHAT_CATEGORY_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    onClick={() => {
                      const chatbot = document.getElementById('chatbot');
                      if (chatbot) chatbot.scrollIntoView({ behavior: 'smooth' });
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('tia:footer-chat-category', { detail: { category: option.value as ChatCategory } }));
                      }, 100);
                    }}
                    className="text-neutral-400 hover:text-white transition-colors text-xs"
                  >
                    {t(option.labelKey, lang)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">{t('footer.links', lang)}</h4>
            <ul className="space-y-2">
              {[
                { key: 'footer.servizi', href: '#servizi' },
                { key: 'footer.progetti', href: '#progetti' },
                { key: 'footer.chisono', href: '#chisono' },
                { key: 'footer.processo', href: '#processo' },
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
              <li>{t('contatti.vat_invoice', lang)}</li>
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
