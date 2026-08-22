'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useLenis } from './SmoothScroll';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import { playMenuOpenSound, playMenuCloseSound } from '@/lib/menu-sounds';
import { scrollToElementAfterLayout, triggerArrivalGlow } from '@/lib/scroll';
import { SECTION_OFFSETS } from '@/lib/animation-theme';

// ── Nav items — numbers for 27km-style menu ───────────────────

const NAV_ITEMS = [
  { key: 'servizi', href: '#servizi' },
  { key: 'processo', href: '#processo' },
  { key: 'prezzi', href: '#prezzi' },
  { key: 'progetti', href: '#progetti' },
  { key: 'chisono', href: '#chisono' },
  { key: 'recensioni', href: '#recensioni' },
  { key: 'faq', href: '#faq' },
];

// ── Logo ───────────────────────────────────────────────────────

function Logo() {
  return (
    <Link
      href="/"
      onClick={(e) => {
        // Brand click = hard refresh: resets the SPA (splash, scroll, chat)
        // exactly as if the user reloaded the tab.
        e.preventDefault();
        window.location.reload();
      }}
      // inline-block shrink-wraps the image: an inline <a> around a block-level
      // <img> otherwise stretches the clickable box across the whole navbar,
      // putting it ABOVE the header (z-10040 > z-9999) and swallowing taps
      // aimed at the hamburger → the menu click "reloaded" the page.
      className="shrink-0 inline-block"
    >
      <picture>
        <source srcSet="/TiaDesignsLogo.avif" type="image/avif" />
        <source srcSet="/TiaDesignsLogo.webp" type="image/webp" />
        <img
          src="/TiaDesignsLogo.png"
          alt="Tia Designs"
          loading="lazy"
          className="h-5 sm:h-6 w-auto brightness-0 invert select-none"
          draggable="false"
        />
      </picture>
    </Link>
  );
}

// ── FullscreenMenu (all screen sizes) ─────────────────────────

function FullscreenMenu({ onNavClick, onClose, closing = false }: { onNavClick: (href: string) => void; onClose: () => void; closing?: boolean }) {
  const { lang } = useLanguage();
  const { lenis } = useLenis();

  // ── Scroll lock + stop Lenis ──
  useEffect(() => {
    const scrollY = window.scrollY;
    const lenisInstance = lenis.current;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    // iOS Safari workaround: block rubber-band overscroll
    document.body.style.overscrollBehavior = 'none';
    lenisInstance?.stop();
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overscrollBehavior = '';
      window.scrollTo(0, scrollY);
      lenisInstance?.scrollTo(scrollY, { immediate: true, force: true });
      lenisInstance?.start();
    };
  }, [lenis]);

  // ── Escape key ──
  useEffect(() => {
    const cb = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-[10001] flex ${closing ? 'pointer-events-none' : ''}`}>
      {/* Glass backdrop — fades 100ms after content. Full-viewport
          backdrop-blur over the composited page (body position:fixed) is the
          exact surface that triggered the Samsung/Android renderer-kill with
          24px. On mobile the base is bg-black/80 (80% opaque), so the blur
          behind it is barely visible: 4px gives the same look at a fraction
          of the GPU cost. The real glass is on the small panels; sm+ keeps
          the full 24px blur where the background is lighter. Weak devices
          get all blur removed by the .is-low-end rule anyway. */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm sm:bg-black/50 sm:backdrop-blur-xl transition-opacity duration-200 delay-100 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
      />

      {/* ═══ Content — above backdrop, shrinks immediately ═══ */}
      {/* Clicking empty space closes the menu (clicks on buttons/links don't propagate) */}
      <div
        className={`relative z-10 flex flex-col w-full h-full transition-[transform,opacity] duration-200 ${closing ? 'opacity-0 scale-[0.97]' : 'opacity-100 scale-100'}`}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Top bar intentionally empty — logo is in the sticky header above */}

        {/* Nav items — spread out, large typography, 27km-inspired */}
        <nav className="menu-scrollbar-hidden flex-1 flex flex-col justify-center px-5 sm:px-12 overflow-y-auto">
          <div className="flex flex-col gap-0.5 sm:gap-1 max-w-3xl mx-auto w-full">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={item.href}
                onClick={() => onNavClick(item.href)}
                className="group flex items-baseline gap-4 sm:gap-8 py-2.5 sm:py-4 text-left w-full animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'backwards' }}
              >
                <span className="text-[10px] sm:text-xs font-mono text-teal-400/60 group-hover:text-teal-400 group-hover:scale-110 inline-block transition-all duration-300 w-6 shrink-0 text-right pt-1.5 sm:pt-2">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-white/50 group-hover:text-white transition-colors duration-300 select-none">
                  {t(`nav.${item.key}`, lang)}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom bar: Contact info + Legal + WhatsApp */}
        <div className="px-5 sm:px-12 py-5 sm:py-7 border-t border-white/[0.05]">
          <div className="max-w-3xl mx-auto flex flex-row items-end justify-between gap-2 sm:gap-4">
            {/* Left: Contact info + WhatsApp + Language */}
            <div className="flex flex-col gap-2">
              <a
                href="mailto:info@tiadesigns.it"
                className="text-sm sm:text-base font-medium text-white/60 hover:text-white transition-colors"
              >
                info@tiadesigns.it
              </a>
              <a
                href="tel:+393318821334"
                className="text-sm sm:text-base font-medium text-white/60 hover:text-white transition-colors"
              >
                +39 331 882 1334
              </a>
              <a
                href="https://wa.me/393318821334"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors self-start"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <LanguageSwitcher variant="clean" />
              </div>
            </div>
            {/* Right: Legal links + Cookie settings — fully right-aligned */}
            <div className="flex flex-col gap-1.5 items-end">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: 'terms' }))}
                className="text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-colors text-right w-full"
              >
                {t('footer.termini', lang)}
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: 'privacy' }))}
                className="text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-colors text-right w-full"
              >
                {t('footer.privacy', lang)}
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: 'cookies' }))}
                className="text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-colors text-right w-full"
              >
                {t('footer.cookie', lang)}
              </button>
              <button
                onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
                className="text-xs sm:text-sm text-teal-400/70 hover:text-teal-300 transition-colors mt-1 text-right w-full"
              >
                {t('footer.cookie_prefs', lang)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuVisibleRef = useRef(false);
  const { lenis } = useLenis();
  const { lang } = useLanguage();

  // Keep ref in sync for the closing effect (avoids stale closure)
  useEffect(() => { menuVisibleRef.current = menuVisible; }, [menuVisible]);

  useEffect(() => {
    const instance = lenis.current;
    if (!instance) return;
    const onScroll = ({ scroll }: { scroll: number }) => setIsScrolled(scroll > 20);
    instance.on('scroll', onScroll);
    return () => { instance.off('scroll', onScroll); };
  }, [lenis]);

  const scrollTo = (href: string) => {
    const sectionId = href.replace(/^#/, '');
    scrollToElementAfterLayout(href, lenis.current, {
      offsetPx: SECTION_OFFSETS[sectionId] ?? 0,
      onComplete: () => triggerArrivalGlow(sectionId),
    });
  };

  // ── Delay menu appearance so hamburger→X animation is visible, and fade-out on close ──
  useEffect(() => {
    if (menuOpen) {
      // Clear any pending close timer
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      menuTimerRef.current = setTimeout(() => setMenuVisible(true), 350);
    } else {
      // Clear pending open timer (user closed before 350ms)
      if (menuTimerRef.current) clearTimeout(menuTimerRef.current);

      if (menuVisibleRef.current) {
        // Menu is visible → animate fade-out first
        playMenuCloseSound();
        setClosing(true);
        closeTimerRef.current = setTimeout(() => {
          setMenuVisible(false);
          setClosing(false);
        }, 300);
      }
    }
    return () => {
      if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    // Mount lazy sections NOW so their anchors exist before we scroll.
    window.dispatchEvent(new Event('tia:force-mount'));
    setMenuOpen(false);
    // Wait for the menu to FULLY close (300 ms close animation + unmount
    // cleanup that restores body scroll and restarts Lenis). Scrolling any
    // earlier is silently cancelled by that cleanup — the classic "click
    // does nothing" bug. After the overlay is gone, scroll normally.
    window.setTimeout(() => {
      scrollTo(href);
    }, 650);
  };

  return (
    <>
      {/* ── BRAND OVERLAY — the logo always floats above modals ── */}
      {/* The modal title is padded (pl-16/pl-28 in the modals) to clear it.
          pointer-events-none on the strip, auto on the logo link itself, so
          the rest of the top bar never blocks clicks below. */}
      {/* When the Apple-style language banner is up it publishes
          --lang-banner-h on <html>; both fixed bars slide down below it and
          back up when it closes (Apple-style "pushed" page). */}
      <div
        className="fixed top-0 left-0 right-0 z-[10040] pointer-events-none"
        style={{ top: 'var(--lang-banner-h, 0px)', transition: 'top 500ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div
          className={`mx-auto transition-all duration-600 px-4 sm:px-10 lg:px-16 ${
            isScrolled
              ? 'max-w-5xl py-1.5 sm:py-2'
              : 'max-w-none py-3 sm:py-3.5'
          }`}
          style={{
            transitionTimingFunction: isScrolled
              ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <span className="pointer-events-auto">
            <Logo />
          </span>
        </div>
      </div>

      {/* ── HEADER (hamburger only) ── */}
      {/* z-[10002] when the menu is open (above the menu's z-[10001], so the
          close button stays clickable) but BELOW every modal (z-[10005]+):
          the X must never sit on top of a modal. A width-matching spacer on
          the left keeps the button right-aligned like the logo used to. */}
      <header
        className={`fixed top-0 left-0 right-0 ${(menuVisible || closing) ? 'z-[10002]' : 'z-[9999]'}`}
        style={{ top: 'var(--lang-banner-h, 0px)', transition: 'top 500ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div
          className={`flex items-center justify-between mx-auto transition-all duration-600 px-4 sm:px-10 lg:px-16 ${
            isScrolled
              ? 'max-w-5xl gap-2 sm:gap-4 py-1.5 sm:py-2'
              : 'max-w-none gap-3 sm:gap-6 py-3 sm:py-3.5'
          }`}
          style={{
            transitionTimingFunction: isScrolled
              ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Invisible spacer — mirrors the logo width so the hamburger keeps
              its position (logo lives in the overlay above). */}
          <span className="w-[37px] sm:w-[45px] h-5 sm:h-6 shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-3">

            {/* Hamburger — always visible, all screen sizes */}
            {/* Large invisible ::before area makes clicking easy even with pixel trail */}
            <button
              className="relative w-[22px] h-[18px] transition-transform duration-300 z-0 before:absolute before:content-[''] before:inset-[-14px] before:rounded-lg"
              onClick={() => { const opening = !menuOpen; setMenuOpen(opening); if (opening) { setClosing(false); playMenuOpenSound(); } }}
              aria-label={t('nav.menu', lang)}
            >
              <span className={`absolute left-0 top-0 w-full h-[2px] rounded-sm bg-white transition-all duration-300 origin-center ${menuOpen ? 'top-[8px] rotate-45' : 'hover:scale-x-[0.8]'}`} style={{ transitionTimingFunction: 'cubic-bezier(.8, .5, .2, 1.4)' }} />
              <span className={`absolute left-0 top-[8px] w-full h-[2px] rounded-sm bg-white transition-all duration-300 ${menuOpen ? 'scale-0 opacity-0' : 'hover:scale-x-[0.5]'}`} style={{ transitionDuration: menuOpen ? '50ms' : '300ms', transitionTimingFunction: 'cubic-bezier(.8, .5, .2, 1.4)' }} />
              <span className={`absolute left-0 bottom-0 w-full h-[2px] rounded-sm bg-white transition-all duration-300 origin-center ${menuOpen ? 'top-[8px] -rotate-45' : 'hover:scale-x-[0.8]'}`} style={{ transitionTimingFunction: 'cubic-bezier(.8, .5, .2, 1.4)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* FullscreenMenu outside header — sibling stacking context, not nested */}
      {(menuVisible || closing) && (
        <FullscreenMenu
          closing={closing}
          onNavClick={handleNavClick}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
