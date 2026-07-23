'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import Link from 'next/link';
import BorderGlow from './BorderGlow';
import { useLenis } from './SmoothScroll';

interface NavItemDef {
  label: string;
  href: string;
  dropdown?: { label: string; href: string; icon: string }[];
}

const NAV_ITEMS: NavItemDef[] = [
  {
    label: 'Servizi',
    href: '#servizi',
    dropdown: [
      { label: 'Brand & Graphic', href: '#servizi', icon: '🎨' },
      { label: 'Sviluppo Web', href: '#servizi', icon: '🌐' },
      { label: 'Software & App', href: '#servizi', icon: '⚛️' },
      { label: 'Video Making', href: '#servizi', icon: '🎬' },
    ],
  },
  {
    label: 'Prezzi',
    href: '#prezzi',
    dropdown: [
      { label: 'Design', href: '#prezzi', icon: '🎨' },
      { label: 'Sviluppo Web', href: '#prezzi', icon: '🌐' },
      { label: 'Software', href: '#prezzi', icon: '⚛️' },
      { label: 'Video Making', href: '#prezzi', icon: '🎬' },
    ],
  },
  { label: 'Progetti', href: '#progetti' },
  { label: 'Chi sono', href: '#chisono' },
  { label: 'Recensioni', href: '#recensioni' },
  { label: 'FAQ', href: '#faq' },
];

// ── Shared NavContent ──────────────────────────────────────────

function NavContent({
  openDropdown,
  menuOpen,
  onMouseEnter,
  onMouseLeave,
  onNavClick,
  onCTAClick,
  onMenuToggle,
}: {
  openDropdown: string | null;
  menuOpen: boolean;
  onMouseEnter: (label: string) => void;
  onMouseLeave: () => void;
  onNavClick: (href: string) => void;
  onCTAClick: () => void;
  onMenuToggle: () => void;
}) {
  return (
    <>
      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.href}
            className="relative"
            onMouseEnter={() => item.dropdown && onMouseEnter(item.label)}
            onMouseLeave={onMouseLeave}
          >
            <button
              onClick={() => onNavClick(item.href)}
              className="px-2.5 py-1.5 rounded-xl text-[13px] font-medium transition-all text-neutral-400 hover:text-white hover:bg-white/[0.06] whitespace-nowrap"
            >
              {item.label}
            </button>

            {item.dropdown && openDropdown === item.label && (
              <div
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 z-50 min-w-[220px]"
                onMouseEnter={() => onMouseEnter(item.label)}
                onMouseLeave={onMouseLeave}
              >
                <div className="grid grid-cols-1 gap-1">
                  {item.dropdown.map((d, idx) => (
                    <button
                      key={d.label}
                      onClick={() => onNavClick(d.href)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all text-neutral-300 hover:text-white hover:bg-white/[0.07] ${idx === 0 ? 'bg-white/[0.03]' : ''}`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-sm shrink-0">
                        {d.icon}
                      </span>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* CTA button */}
      <button
        onClick={onCTAClick}
        className="hidden sm:inline-flex rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all shrink-0 bg-teal-600 text-white hover:bg-teal-500"
      >
        Contattami
      </button>

      {/* Hamburger */}
      <button
        className="md:hidden relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
        onClick={onMenuToggle}
        aria-label="Menu"
      >
        <div className="w-4 h-3 flex flex-col justify-between">
          <span className={`block h-[2px] w-full rounded-full transition-all duration-300 origin-center bg-neutral-300 ${menuOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
          <span className={`block h-[2px] w-full rounded-full transition-all duration-300 bg-neutral-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block h-[2px] w-full rounded-full transition-all duration-300 origin-center bg-neutral-300 ${menuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
        </div>
      </button>
    </>
  );
}

// ── MobileMenu ─────────────────────────────────────────────────

function MobileMenu({ onNavClick, onCTAClick }: { onNavClick: (href: string) => void; onCTAClick: () => void }) {
  return (
    <div className="md:hidden bg-[#0f0f0f]/98 backdrop-blur-xl border-b border-white/10 px-6 py-4 shadow-xl shadow-black/40">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.href}
            onClick={() => onNavClick(item.href)}
            className="text-left px-4 py-3 rounded-xl text-neutral-300 hover:bg-white/[0.06] text-[15px] font-medium transition-all"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <button
        onClick={onCTAClick}
        className="w-full mt-2 bg-teal-600 text-white hover:bg-teal-500 rounded-xl py-3 text-[15px] font-medium"
      >
        Contattami
      </button>
    </div>
  );
}

// ── Logo ───────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="shrink-0">
      <img
        src="/TiaDesignsLogo.png"
        alt="Tia Designs"
        loading="lazy"
        className="h-5 sm:h-6 w-auto brightness-0 invert select-none"
        draggable="false"
      />
    </Link>
  );
}

// ── Main Navbar ────────────────────────────────────────────────

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { lenis } = useLenis();

  useEffect(() => {
    const instance = lenis.current;
    if (!instance) return;
    const onScroll = ({ scroll }: { scroll: number }) => setIsScrolled(scroll > 20);
    instance.on('scroll', onScroll);
    return () => { instance.off('scroll', onScroll); };
  }, [lenis]);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (!el) return;
    const instance = lenis.current;
    if (instance) {
      instance.scrollTo(el as HTMLElement, { offset: -60, duration: 1.2 });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMouseEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const handleNavClick = (href: string) => {
    setOpenDropdown(null);
    scrollTo(href);
  };

  const handleCTAClick = () => {
    setOpenDropdown(null);
    scrollTo('#contatti');
  };

  const handleMenuToggle = () => setMenuOpen(!menuOpen);

  const sharedProps = {
    openDropdown,
    menuOpen,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onNavClick: handleNavClick,
    onCTAClick: handleCTAClick,
    onMenuToggle: handleMenuToggle,
  };

  return (
    <>
      {/* ── TOP BAR — full-width glass, slides up and out on scroll ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ease-in ${
          isScrolled
            ? 'opacity-0 pointer-events-none -translate-y-full'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center justify-between gap-4 sm:gap-6 px-6 sm:px-10 lg:px-16 py-3 sm:py-3.5 backdrop-blur-md bg-white/[0.02] border-b border-white/[0.05]">
          <Logo />
          <NavContent {...sharedProps} />
        </div>
        {menuOpen && <MobileMenu onNavClick={handleNavClick} onCTAClick={handleCTAClick} />}
      </header>

      {/* ── FLOATING PILL — extracts from ceiling, drops down on scroll ── */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-600 ${
          isScrolled
            ? 'top-4 sm:top-5 opacity-100 scale-100'
            : 'top-0 opacity-0 pointer-events-none scale-x-[0.96] scale-y-[0.92]'
        }`}
        style={{ transitionTimingFunction: isScrolled ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-in' }}
      >
        <BorderGlow
          continuousHover
          borderRadius={20}
          glowRadius={24}
          glowIntensity={2.6}
          fillOpacity={0}
          backgroundColor="rgba(10,10,10,0.55)"
          edgeSensitivity={0}
          className="[&.border-glow-card]:!shadow-none [&.border-glow-continuous:hover::after]:!opacity-0"
        >
          <div className="flex items-center justify-between gap-1 sm:gap-4 md:gap-5 px-4 sm:px-6 py-2.5 sm:py-3 backdrop-blur-xl bg-black/40 rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/60 w-[calc(100vw-1rem)] sm:w-auto">
            <Logo />
            <NavContent {...sharedProps} />
          </div>
        </BorderGlow>
        {menuOpen && <MobileMenu onNavClick={handleNavClick} onCTAClick={handleCTAClick} />}
      </div>
    </>
  );
}
