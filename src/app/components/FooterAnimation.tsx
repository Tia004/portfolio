'use client';

import React, { useLayoutEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FOOTER } from '@/lib/animation-theme';
import { SECTION_OFFSETS } from '@/lib/animation-theme';
import { type Lang, t } from '@/lib/translations';
import { useLenis } from './SmoothScroll';
import { scrollToElementAfterLayout, triggerArrivalGlow, refreshScrollTriggers } from '@/lib/scroll';

/**
 * FooterAnimation — split-text rising wordmark + gradient glow
 * Splits "Tia Designs" into individual <span>s via innerHTML in
 * useLayoutEffect (before paint), then animates each character with
 * GSAP ScrollTrigger as the footer enters the viewport.
 * A reversible one-shot reveal (gsap.to) guarantees the text is never
 * missing if the trigger positions go stale, WITHOUT permanently blocking
 * the scrub (the old CSS class used !important and made it static).
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

    // GSAP setup — isolated in try/catch so a plugin/trigger failure can never
    // prevent sizing (already done above) or the reveal failsafe below.
    let ctx: gsap.Context | null = null;
    try {
      ctx = gsap.context(() => {
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
        refreshScrollTriggers();
      }, section);
    } catch (err) {
      console.error('[footer] GSAP init fallito:', err);
    }

    // ── The wordmark must never be missing ────────────────────
    // The chars start at opacity:0 and are revealed by the ScrollTrigger
    // scrub. The footer mounts LAST via next/dynamic, and the page height
    // keeps changing while the lazy sections / fonts / images above settle
    // — if the trigger positions are stale at that point, the scrub never
    // advances and "Tia Designs" stays invisible. Protection:
    //   1) re-measure after the page truly settles (load + fonts + delayed)
    //      and whenever a lazy section mounts (tia:section-mounted — that's
    //      the main source of late page-height changes);
    //   2) if the wordmark is on screen and the chars are STILL fully hidden,
    //      reveal them with a one-shot, REVERSIBLE gsap.to — NOT a CSS class:
    //      the class used !important and permanently blocked the scrub, which
    //      is exactly the "static wordmark" regression. A plain gsap.to is
    //      overridden the moment the scrub updates, so once the trigger is
    //      refreshed the scroll-linked reveal resumes.
    const revealOnce = () => {
      if (!section || charEls.length === 0) return;
      const r = wordmark.getBoundingClientRect();
      // The wordmark must be meaningfully on screen (top above the middle)
      // before we consider it "stuck" — a partially-entering wordmark with a
      // working scrub has partially-revealed chars and must NOT be forced.
      const onScreen = r.top < window.innerHeight * 0.5 && r.bottom > 0;
      if (!onScreen) return;
      const stuck = Array.from(charEls).every((c) => parseFloat(getComputedStyle(c).opacity) < 0.05);
      if (stuck) {
        // Before declaring the scrub dead, re-measure the trigger positions
        // once — the page may have grown since mount (lazy sections above),
        // leaving the trigger range stale and the chars stuck at opacity 0.
        // A single refresh + update is enough; then re-check after a frame
        // and only force visibility if the scrub genuinely never advances.
        if (!refreshAttempted) {
          refreshAttempted = true;
          ScrollTrigger.refresh();
          ScrollTrigger.update();
          requestAnimationFrame(() => {
            const stillStuck = Array.from(charEls).every((c) => parseFloat(getComputedStyle(c).opacity) < 0.05);
            if (stillStuck) gsap.to(charEls, { opacity: 1, y: 0, rotateX: 0, duration: 0.4 });
          });
        } else {
          gsap.to(charEls, { opacity: 1, y: 0, rotateX: 0, duration: 0.4 });
        }
      }
    };


    let refreshAttempted = false;
    const refreshOnce = () => {
      fitWordmark();
      refreshScrollTriggers();
      revealOnce();
    };

    // Refit on any container resize (orientation change on phones) —
    // rAF-throttled, and re-measures ScrollTrigger after the size settles.
    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        refreshOnce();
      });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(wordmark);

    // Re-measure once everything settles (same late-layout pattern used by
    // ScrollReveal/StaggerReveal for content-visibility dimension changes).
    // tia:section-mounted is the BIG one: every lazy section above mounts
    // while scrolling near it, growing the page and shifting the footer's
    // trigger positions — refresh right away so the scrub never goes stale.
    window.addEventListener('load', refreshOnce, { once: true });
    window.addEventListener('tia:section-mounted', refreshOnce);
    document.fonts?.ready.then(refreshOnce).catch(() => {});
    const t1 = window.setTimeout(refreshOnce, 800);
    const t2 = window.setTimeout(refreshOnce, 2500);

    // ── Fresh trigger positions right before the footer enters ──
    // The page keeps growing while the lazy sections above mount, so the
    // positions measured at mount are stale by the time the user reaches the
    // footer — the scrub sits at progress 1 and the wordmark is visible but
    // STATIC. refreshScrollTriggers() is scroll-aware and skips during a
    // gesture, i.e. exactly when the user is scrolling here, so use a direct
    // refresh instead: the footer approaches only after every section above
    // has mounted, and a single refresh is a bounded, non-jittering event.
    // Re-arms when the footer leaves the 1.5-viewport approach zone.
    let approachRefreshed = false;
    const approachIO = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && !approachRefreshed) {
          approachRefreshed = true;
          fitWordmark();
          ScrollTrigger.refresh();
          ScrollTrigger.update();
        } else if (!visible) {
          approachRefreshed = false;
        }
      },
      { rootMargin: '0px 0px 150% 0px', threshold: 0 }
    );
    approachIO.observe(section);

    // Scroll-driven failsafe (rAF-throttled): catches a stale trigger even
    // if the user reaches the footer before any timer has fired. Lenis
    // scrolls via window.scrollTo, so the native scroll event fires on every
    // frame — this works whether or not the Lenis instance is ready yet.
    let rafPending = false;
    const onScrollFailsafe = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        revealOnce();
      });
    };
    window.addEventListener('scroll', onScrollFailsafe, { passive: true });

    return () => {
      ctx?.revert();
      ro.disconnect();
      approachIO.disconnect();
      window.removeEventListener('load', refreshOnce);
      window.removeEventListener('tia:section-mounted', refreshOnce);
      window.removeEventListener('scroll', onScrollFailsafe);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
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
