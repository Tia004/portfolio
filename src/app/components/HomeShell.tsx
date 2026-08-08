'use client';

/** @category React e Core */
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import InfiniteSlider from './InfiniteSlider';
import { useLanguage } from './LanguageProvider';
import { t, getFaqs, getReviews, getProjects, getPricingOnetime, getPricingMonthly, type ProjectData } from '@/lib/translations';
import { trackClick } from '@/lib/analytics';
import { type ChatCategory } from '@/lib/chat-categories';
import { isInappropriateChatMessage, isInappropriateContactValue } from '@/lib/chat-moderation';

/** @category Componente Icone */
import TiaIcon from './TiaIcon';
import {
  // ─── Design ─────────────────────────────
  FigmaIcon,
  AdobePhotoshopIcon,
  AdobeIllustratorIcon,
  WebDesign01Icon,
  LayersIcon,
  LayoutGridIcon,
  PaintBoardIcon,
  ColorsIcon,

  // ─── Sviluppo Web ──────────────────────
  ReactIcon,
  CodeFolderIcon,
  Typescript01Icon,
  JavaScriptIcon,
  ThreeDViewIcon,
  TailwindcssIcon,
  CodeIcon,

  // ─── Software & Backend ────────────────
  PythonIcon,
  CProgrammingIcon,
  JavaIcon,
  PhpIcon,
  DiamondIcon,
  MobileProgramming01Icon,
  ServerStack01Icon,
  Database01Icon,
  ContainerIcon,
  TerminalIcon,

  // ─── AI & Automazione ──────────────────
  ArtificialIntelligence01Icon,
  ChatGptIcon,
  WorkflowCircle01Icon,
  ClaudeIcon,
  WorkflowSquare01Icon,
  Robot01Icon,

  // ─── Video Making ─────────────────────
  AdobePremierIcon,
  AdobeAfterEffectIcon,
  FilmRoll01Icon,
  Scissor01Icon,
  Motion01Icon,
  Video01Icon,
  PlayIcon,

  // ─── Hardware & IT ─────────────────────
  CpuIcon,
  RepairIcon,
  Github01Icon,

  // ─── Comunicazione & Contatti ──────────
  Mail01Icon,
  CallIcon,
  WhatsappIcon,
  BubbleChatIcon,
  UserIcon,
  Location01Icon,
  Clock01Icon,

  // ─── UI / Azioni ──────────────────────
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  LoaderPinwheelIcon,
  FilePenIcon,
  DollarSignIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  ExternalLinkIcon,
} from './icons';;

/** @category Componenti */
import SmoothScrollProvider, { useLenis } from './SmoothScroll';
import Dither from './Dither';
import Navbar from './Navbar';
import FaqScroller from './FaqScroller';
import ScrollReveal from './ScrollReveal';
import StaggerReveal from './StaggerReveal';
import CurvedInput from './CurvedInput';
const FooterAnimation = dynamic(() => import('./FooterAnimation'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-[#050505]" aria-hidden="true" />,
});
import LegalModal from './LegalModal';
import { getLegalDoc, type LegalDoc } from '@/lib/legal-content';
import BorderGlow from './BorderGlow';
import DotGrid from './DotGrid';
import TooltipContent from './TooltipContent';
import UrlPreviewCard from './UrlPreviewCard';
import InlinePreventivoForm from './InlinePreventivoForm';
import MobileGlowActivator from './MobileGlowActivator';
import ProjectModal from './ProjectModal';
import LazySection from './LazySection';
import TypewriterText from './TypewriterText';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { scheduleTick, unscheduleTick } from '@/lib/useSharedTicker';
import { ensureChatSession, mountTurnstile, secureChatFetch } from '@/lib/chat-client';


/** @category Hooks */
import { useTooltip } from '@/lib/useTooltip';

/** @category Dati e Config */
import { getTooltip } from '@/lib/tooltips';
import { HERO, STAGGER_BY_SECTION, HERO_COUNTUP_DELAYS, SKILL_TITLE_OFFSET } from '@/lib/animation-theme';
import { scrollToElementAfterLayout, triggerArrivalGlow } from '@/lib/scroll';
import { isValidContactEmail, isValidContactMessage, isValidContactName } from '@/lib/input-validation';

// ── Custom ServiceSelect (grouped by macro-area) ─────────────

interface GroupItem {
  value: string;
  labelKey: string;
}

const SERVICE_GROUPS: { labelKey: string; items: GroupItem[] }[] = [
  {
    labelKey: 'servizi.design_cat',
    items: [
      { value: 'Brand & Logo', labelKey: 'servizi.option_brand_logo' },
      { value: 'Grafica & Social', labelKey: 'servizi.option_graphic_social' },
      { value: 'UI/UX Design', labelKey: 'servizi.option_uiux' },
    ],
  },
  {
    labelKey: 'servizi.webdev_cat',
    items: [
      { value: 'Sito Web', labelKey: 'servizi.option_website' },
      { value: 'Software & App', labelKey: 'servizi.option_software_app' },
    ],
  },
  {
    labelKey: 'servizi.video_cat',
    items: [
      { value: 'Contenuti Video', labelKey: 'servizi.option_video_content' },
      { value: 'Post-Produzione', labelKey: 'servizi.option_post_prod' },
    ],
  },
  {
    labelKey: 'servizi.hardware_cat',
    items: [
      { value: 'Informatica Hardware', labelKey: 'servizi.option_hardware' },
    ],
  },
  {
    labelKey: 'servizi.social_cat',
    items: [
      { value: 'Social Media', labelKey: 'servizi.option_social' },
    ],
  },
  {
    labelKey: 'servizi.other_cat',
    items: [
      { value: 'Altro', labelKey: 'servizi.option_other' },
    ],
  },
];

const ALL_OPTIONS = SERVICE_GROUPS.flatMap(g => g.items);

/** Map the AI's natural service wording to an exact ServiceSelect value. */
function normalizeContactService(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.includes('hardware') || /\bpc\b/i.test(lower) || lower.includes('informatica') || /\bit\b/i.test(lower)) return 'Informatica Hardware';
  if (lower.includes('social')) return 'Social Media';
  if (lower.includes('web') || lower.includes('website') || lower.includes('sito')) return 'Sito Web';
  if (lower.includes('software') || lower.includes('app')) return 'Software & App';
  if (lower.includes('brand') || lower.includes('logo')) return 'Brand & Logo';
  if (lower.includes('ui') || lower.includes('ux')) return 'UI/UX Design';
  if (lower.includes('graphic') || lower.includes('grafica')) return 'Grafica & Social';
  if (lower.includes('video') || lower.includes('reel') || lower.includes('montaggio')) return 'Contenuti Video';
  if (lower.includes('post-produzione') || lower.includes('post produzione')) return 'Post-Produzione';
  return ALL_OPTIONS.some(option => option.value.toLowerCase() === lower) ? raw : 'Altro';
}

const CHAT_CATEGORY_OPTIONS: { value: ChatCategory; labelKey: string; exampleKey: string; placeholderKey: string }[] = [
  { value: 'software-web', labelKey: 'chat.category_software_web', exampleKey: 'chat.example_software_web', placeholderKey: 'chat.placeholder_software_web' },
  { value: 'design', labelKey: 'chat.category_design', exampleKey: 'chat.example_design', placeholderKey: 'chat.placeholder_design' },
  { value: 'video', labelKey: 'chat.category_video', exampleKey: 'chat.example_video', placeholderKey: 'chat.placeholder_video' },
  { value: 'hardware', labelKey: 'chat.category_hardware', exampleKey: 'chat.example_hardware', placeholderKey: 'chat.placeholder_hardware' },
  { value: 'social', labelKey: 'chat.category_social', exampleKey: 'chat.example_social', placeholderKey: 'chat.placeholder_social' },
  { value: 'other', labelKey: 'chat.category_other', exampleKey: 'chat.example_other', placeholderKey: 'chat.placeholder_other' },
];

function ServiceSelect({ value, onChange, highlighted }: { value: string; onChange: (v: string) => void; highlighted?: boolean }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleKey);
      };
    }
  }, [open]);

  const selected = ALL_OPTIONS.find(o => o.value === value);

  return (
    <div
      ref={containerRef}
      className={`relative cursor-pointer p-5 ${highlighted ? 'form-highlight' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        // The whole card acts as the trigger. Option buttons keep their own
        // click behavior and must not toggle the menu a second time.
        if (!(event.target as HTMLElement).closest('button')) {
          setOpen(true);
        }
      }}
    >
      <label htmlFor="form-service-trigger" className="block cursor-pointer text-neutral-400 text-xs font-medium uppercase tracking-wider mb-3">{t('contatti.service', lang)}</label>
      <button
        id="form-service-trigger"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-full flex items-center justify-between gap-2 text-left text-sm transition-all group"
      >
        <span className={value ? 'text-white' : 'text-neutral-500'}>
          {selected ? t(selected.labelKey, lang) : t('contatti.select', lang)}
        </span>
        <svg aria-hidden="true" className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          aria-label={t('contatti.service', lang)}
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="absolute top-full left-3 right-3 mt-1 z-[45] max-h-[280px] overflow-y-auto overscroll-contain touch-pan-y overscroll-y-contain rounded-2xl border border-white/10 bg-[#121212] shadow-2xl shadow-black/60 backdrop-blur-xl scrollbar-custom"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {SERVICE_GROUPS.map((group, gi) => (
            <div key={group.labelKey}>
              {gi > 0 && <div className="mx-4 h-px bg-white/[0.06]" />}
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-teal-400/70">
                {t(group.labelKey, lang)}
              </div>
              {group.items.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center gap-3 ${value === opt.value
                    ? 'bg-teal-500/10 text-teal-400 font-medium'
                    : 'text-neutral-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${value === opt.value ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'bg-white/20'}`} />
                  {t(opt.labelKey, lang)}
                  {value === opt.value && (
                    <svg aria-hidden="true" className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tooltip explanations for technical features ─────────────────

// ── DotGridCard ────────────────────────────────────────────────

/** Wraps a servizi card.
 *
 *  Pre-mounts the DotGrid canvas when the card enters the viewport (IO with
 *  400px rootMargin) so buildGrid runs before the user ever hovers — zero
 *  first-hover delay.  The canvas stays alive while the card is near the
 *  viewport; DotGrid's own IO pauses its rAF loop when off-screen, so the
 *  DOM cost is negligible.
 *
 *  fadeIn (hover-driven) is kept for any CSS transitions the caller may
 *  attach to the grid. */
function DotGridCard({ children, className = '' }: { children: (mounted: boolean, fadeIn: boolean) => React.ReactNode; className?: string }) {
  const [viewportMounted, setViewportMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const mounted = viewportMounted || hovered;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const enter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(true);
    if (!fadeIn) setFadeIn(true);
  }, [fadeIn]);

  const leave = useCallback(() => {
    setHovered(false);
    setFadeIn(false);
    // Only schedule unmount if the card was never primed by the viewport IO.
    // Once viewportMounted is true the canvas stays alive at idle (DotGrid's
    // own IO pauses its rAF, so the only cost is DOM memory).
    if (!viewportMounted) {
      timerRef.current = setTimeout(() => {
        setHovered(false);
        setFadeIn(false);
      }, 30_000);
    }
  }, [viewportMounted]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // ── IntersectionObserver: pre-mount canvas when card is near viewport ──
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setViewportMounted(true);
        io.disconnect(); // fire once — canvas stays alive
      }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Same LazySection race as BorderGlow: the card may appear under the
  // mouse. The browser fires :hover CSS but mouseenter does not trigger
  // (the element appeared — the pointer never "entered" it).
  // useLayoutEffect runs before paint for zero-frame delay.
  useLayoutEffect(() => {
    if (wrapperRef.current?.matches(':hover')) {
      setHovered(true);
      setFadeIn(true);
    }
  }, []);

  return (
    <div ref={wrapperRef} onMouseEnter={enter} onMouseLeave={leave} className={`h-full ${className}`}>
      {children(mounted, fadeIn)}
    </div>
  );
}

// ── CountUp & HeroGlow (extracted to CountUp.tsx) ─────────────
import { CountUp, HeroGlow } from './CountUp';

// ── TiltCard — effetto 3D al passaggio mouse (DOM diretto, zero re-render) ──

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const canTiltRef = useRef(false);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  // Visibility is tracked in a ref only: it is read by the mousemove handler
  // but never rendered, so a state update here would re-render the whole tree
  // every time a card crosses the viewport boundary during scroll (dozens of
  // times per frame across ~300 skill cards) — pure waste.
  const isVisibleRef = useRef(false);

  // Keep hover work off touch devices, reduced-motion setups, and devices
  // where a 3D effect would cost more than it adds.
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const syncMotionPreference = () => {
      canTiltRef.current = media.matches;
      if (!media.matches && tiltRef.current) {
        tiltRef.current.style.transform = 'none';
        tiltRef.current.style.willChange = 'auto';
        activeRef.current = false;
      }
    };
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  // Pause mousemove processing when the layout wrapper is off-screen.
  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (!entry.isIntersecting && tiltRef.current) {
          tiltRef.current.style.transform = 'none';
          tiltRef.current.style.willChange = 'auto';
          activeRef.current = false;
        }
      },
      { rootMargin: '150px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Coalesce mousemove into a single rAF paint per frame using the shared
  // ticker — no per-component rAF, just one shared loop for all tilt cards,
  // BorderGlow, and PixelTrail mousemove flushes.
  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const tiltScheduledRef = useRef(false);

  const paintTilt = useCallback(() => {
    tiltScheduledRef.current = false;
    unscheduleTick(paintTilt);
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    const layout = layoutRef.current;
    const tilt = tiltRef.current;
    if (!pending || !layout || !tilt || !isVisibleRef.current || !canTiltRef.current) return;
    // Measure the stable, untransformed wrapper. Measuring the tilted element
    // itself would introduce feedback/jitter as its bounds change every frame.
    const rect = layout.getBoundingClientRect();
    const x = (pending.x - rect.left) / rect.width - 0.5;
    const y = (pending.y - rect.top) / rect.height - 0.5;
    tilt.style.willChange = 'transform';
    tilt.style.transform = `perspective(800px) rotateX(${y * -10}deg) rotateY(${x * 10}deg) scale3d(1.02,1.02,1)`;
    if (!activeRef.current) {
      activeRef.current = true;
      setActive(true);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isVisibleRef.current || !canTiltRef.current) return;
    pendingMoveRef.current = { x: e.clientX, y: e.clientY };
    if (!tiltScheduledRef.current) {
      tiltScheduledRef.current = true;
      scheduleTick(paintTilt, 'TiltCard');
    }
  };

  const handleMouseLeave = () => {
    pendingMoveRef.current = null;
    if (tiltScheduledRef.current) {
      tiltScheduledRef.current = false;
      unscheduleTick(paintTilt);
    }
    if (!tiltRef.current || !canTiltRef.current) return;
    tiltRef.current.style.transform = 'none';
    tiltRef.current.style.willChange = 'auto';
    activeRef.current = false;
    setActive(false);
  };

  // Cleanup: unschedule any queued tick on unmount (shared ticker handles
  // the rAF lifecycle; we just need to untrack our callback).
  useEffect(() => () => {
    if (tiltScheduledRef.current) {
      tiltScheduledRef.current = false;
      unscheduleTick(paintTilt);
    }
  }, [paintTilt]);

  return (
    <div
      ref={layoutRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ zIndex: active ? 10 : 1 }}
    >
      <div
        ref={tiltRef}
        style={{
          transition: active ? 'none' : 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          transformStyle: 'preserve-3d',
          willChange: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── PriceCard ─────────────────────────────────────────────────

function PriceCard({
  title,
  price,
  priceLabel,
  period,
  popular,
  premium,
  description,
  delivery,
  hours,
  features,
  onTooltipShow,
  onTooltipHide,
  onRequestQuote,
}: {
  title: string;
  price?: string;
  priceLabel?: string;
  period?: string;
  popular?: boolean;
  premium?: boolean;
  description: string;
  delivery: string;
  hours?: string;
  features: string[];
  onTooltipShow: (text: string, el: HTMLElement) => void;
  onTooltipHide: () => void;
  onRequestQuote?: (serviceTitle: string) => void;
}) {
  const { lang } = useLanguage();
  const { lenis } = useLenis();
  const { getHandlers } = useTooltip(onTooltipShow, onTooltipHide, { showDelay: 300, hideDelay: 100 });
  const dlvHandlers = getHandlers(t('tooltip.enterprise_deadline', lang));
  const rapidaHandlers = getHandlers(t('tooltip.rapid_delivery', lang));

  // ── Position-based cascade delay ──
  // Cards further left start counting sooner. Delay computed once via IO.
  const cardRef = useRef<HTMLDivElement>(null);
  const [computedDelay, setComputedDelay] = useState(-1);

  useEffect(() => {
    if (computedDelay >= 0) return; // Already computed
    const card = cardRef.current;
    if (!card) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || computedDelay >= 0) return;
      const rect = card.getBoundingClientRect();
      const xRatio = Math.max(0, rect.left) / window.innerWidth;
      setComputedDelay(xRatio * 0.5); // Max 0.5s for rightmost card
      io.disconnect();
    }, { rootMargin: '300px 0px' });
    io.observe(card);
    return () => io.disconnect();
  }, [computedDelay]);

  return (
    <div ref={cardRef} className="h-full">
      <BorderGlow
        continuousHover
        borderRadius={20}
        glowRadius={35}
        glowIntensity={2.0}
        edgeSensitivity={0}
        className={`h-full [&_.border-glow-inner]:h-full ${premium ? 'border-teal-400/15' : ''}`}
      >
        <div className={`p-6 sm:p-8 flex flex-col h-full rounded-[20px] relative ${premium ? 'bg-gradient-to-b from-teal-500/[0.06] to-transparent' : ''}`}>
          {popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full z-10">
              {t('prezzi.popular', lang)}
            </span>
          )}
          <h4 className={`font-semibold text-lg mb-1 flex items-center gap-2 ${premium ? 'text-teal-300' : 'text-white'}`}>
            {premium && (
              <svg aria-hidden="true" className="w-4 h-4 text-teal-400 shrink-0 drop-shadow-[0_0_4px_rgba(45,212,191,0.5)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.21 2.07a1 1 0 011.58 0l2.46 3.11a1 1 0 00.84.4l3.96.16a1 1 0 01.88 1.06l-.67 3.9a1 1 0 00.28.87l2.68 2.92a1 1 0 01-.25 1.58l-3.51 1.85a1 1 0 00-.51.74l-.67 3.9a1 1 0 01-1.48.7l-3.5-1.85a1 1 0 00-.9 0l-3.5 1.85a1 1 0 01-1.48-.7l-.67-3.9a1 1 0 00-.51-.74l-3.51-1.85a1 1 0 01-.25-1.58l2.68-2.92a1 1 0 00.28-.87l-.67-3.9a1 1 0 01.88-1.06l3.96-.16a1 1 0 00.84-.4l2.46-3.11z" />
              </svg>
            )}
            {title}
            {delivery === t('prezzi.custom', lang) && (
              <span
                {...dlvHandlers}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-[10px] text-neutral-400 hover:bg-teal-500/20 hover:text-teal-400 cursor-help transition-all font-mono leading-none shrink-0 ml-1"
              >?</span>
            )}
          </h4>
          <p className="text-neutral-500 text-xs mb-4">{description}</p>
          <div className="flex items-center gap-2 mb-4">
            <TiaIcon icon={Clock01Icon} size={14} className="text-teal-400 shrink-0" strokeWidth={2} />
            <span className="text-teal-400/80 text-xs font-medium">{delivery}</span>
            {delivery.match(/giorni|days|días|24-48h|immediata|immediate|inmediata|1-2 settimane|1-2 weeks|1-2 semanas/i) && (
              <span
                {...rapidaHandlers}
                className="ml-2 px-1.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-[9px] font-semibold uppercase tracking-wider text-teal-400 leading-none"
              >
                {t('prezzi.rapid', lang)}
              </span>
            )}
          </div>
          {hours && (
            <div className="flex items-center gap-2 mb-4">
              <svg aria-hidden="true" className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
              <span className="text-teal-400/80 text-xs font-medium">{hours}</span>
            </div>
          )}
          <div className="mb-6">
            {price ? (
              <span className={`text-3xl sm:text-4xl font-bold ${premium ? 'text-teal-300' : 'text-white'}`}>
                <span className="text-neutral-300 text-[11px] font-normal uppercase tracking-[0.15em]" style={{ verticalAlign: 'super' }}>{t('prezzi.from', lang)}</span>
                <CountUp target={parseInt(price.replace(/[.,]/g, ''), 10)} delay={computedDelay} className="" prefix="€" />
              </span>
            ) : (
              <span className={`text-2xl sm:text-3xl font-bold ${premium ? 'text-teal-300' : 'text-white'}`}>
                {priceLabel}
              </span>
            )}
            {period && <span className="text-neutral-500 text-sm ml-1">{period}</span>}
          </div>
          <ul className="space-y-3 flex-1 mb-6">
            {features.map((f, i) => {
              const tip = getTooltip(f, lang);
              return (
                <li key={i} className="flex items-start gap-2 text-neutral-400 text-sm">
                  <svg aria-hidden="true" className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="flex-1">{f}</span>
                  {tip && (
                    <span className="shrink-0 ml-0.5">
                      <span
                        {...getHandlers(tip)}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-[10px] text-neutral-400 hover:bg-teal-500/20 hover:text-teal-400 cursor-help transition-all font-mono leading-none"
                      >?</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => onRequestQuote ? onRequestQuote(title) : scrollToElementAfterLayout('contatti', () => lenis.current)}
            className={`block w-full text-center py-3 rounded-full text-sm font-medium transition-all ${premium
              ? 'bg-teal-400 text-black font-semibold hover:bg-teal-300 shadow-lg shadow-teal-400/40 ring-1 ring-teal-400/50'
              : popular
                ? 'bg-teal-600 text-white hover:bg-teal-500'
                : 'border border-white/10 text-white hover:bg-white/5'
              }`}
          >
            {t('prezzi.cta', lang)}
          </button>
        </div>
      </BorderGlow>
    </div>
  );
}



// ── Subtle notification sound (Web Audio API, no files needed) ──
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Soft chime — two overlapping sine tones
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);          // A5
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.15);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now);         // E6
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);

    // Auto-close after sound ends
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio not available — no sound, no problem
  }
}

// ── Section ID mapping for clickable chatbot links (module-level constants) ──
const SECTION_IDS: Record<string, string> = {
  servizi: 'servizi',
  prezzi: 'prezzi',
  progetti: 'progetti',
  competenze: 'chisono',
  'chi-sono': 'chisono',
  recensioni: 'recensioni',
  faq: 'faq',
  contatti: 'contatti',
};
// Regex built from SECTION_IDS keys — stays in sync automatically, created once
const SECTION_LINK_RE = new RegExp(`(#(?:${Object.keys(SECTION_IDS).join('|')}))`, 'gi');

// URL detection regex — module-level to avoid recreation on every render
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]{2,}(?:\/[^\s]*)?)/gi;

function sanitizeBotText(text: string): string {
  return text
    .replace(/\[PREVENTIVO:[\s\S]*?\]/gi, '')
    .replace(/\[FORM_REQUIRED:[^\]]*\]/gi, '')
    .replace(/\[SUGGESTIONS:[^\]]*\]/gi, '')
    .replace(/(?:private|internal)\s+(?:quote|context|payload|metadata)[^.!?]*[.!?]?/gi, '')
    .replace(/(?:contesto|payload|metadata|protocollo)\s+(?:interno|privato)[^.!?]*[.!?]?/gi, '')
    .replace(/(?:dati|dettagli|informazioni)\s+(?:raccolti|raccolte|inseriti|inserite)\s+(?:per|del|del tuo)\s+preventivo[^.!?]*[.!?]?/gi, '')
    .replace(/Ho completato i dati per il preventivo[^.]*\.?/gi, '')
    .replace(/I have completed the quote details[^.]*\.?/gi, '')
    .replace(/He completado los datos del presupuesto[^.]*\.?/gi, '')
    .trim();
}

/** Strip markdown formatting for plain-text display (contact form, email). */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')           // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')                // *italic* → italic
    .replace(/^\s*[-*]\s+/gm, '• ')             // - item → • item
    .replace(/^#{1,6}\s+/gm, '')                // # heading → heading
    .replace(/`(.+?)`/g, '$1')                   // `code` → code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [text](url) → text
    .trim();
}

function sanitizeStreamingBotText(text: string): string {
  const markerStart = text.search(/\[(?:PREVENTIVO|FORM_REQUIRED|SUGGESTIONS):/i);
  return sanitizeBotText(markerStart >= 0 ? text.slice(0, markerStart) : text);
}

function isDetailedQuote(text: string): boolean {
  const quote = sanitizeBotText(text).trim();
  // A final handoff must contain enough substance to be useful in the email,
  // not merely a greeting or the internal marker itself.
  return quote.length >= 80 && /(?:€|euro|custom|su misura|tailored|personaliz|presupuesto)/i.test(quote);
}

/** Lightweight markdown-to-JSX: bold, lists, and paragraph breaks. */
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  // Split into paragraphs by double-newline
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n');
    // Detect bullet list (all lines start with - or *)
    const isBulletList = lines.length > 1 && lines.every(l => /^\s*[-*]\s/.test(l.trim()));
    if (isBulletList) {
      return (
        <ul key={pi} className="list-disc list-inside space-y-1 mb-2">
          {lines.map((line, li) => {
            const content = line.trim().replace(/^\s*[-*]\s+/, '');
            return <li key={li} className="text-neutral-200 text-sm">{renderInline(content)}</li>;
          })}
        </ul>
      );
    }
    // Regular paragraph
    return (
      <p key={pi} className="mb-2 last:mb-0 text-sm leading-relaxed">
        {renderInline(para)}
      </p>
    );
  });
}

/** Inline markdown: **bold** → <strong> */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^\*]+\*\*)/g);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return <strong key={i} className="font-semibold text-white">{boldMatch[1]}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function HomeShell() {
  const { lenis } = useLenis();
  const [formName, setFormName] = useState('');
  const { lang } = useLanguage();
  const FAQS = useMemo(() => getFaqs(lang), [lang]);
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formService, setFormService] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [formValidationErrors, setFormValidationErrors] = useState<Set<'name' | 'email' | 'message'>>(new Set());
  const [highlightedFields, setHighlightedFields] = useState(new Set<string>());
  const [pulsedDots, setPulsedDots] = useState(new Set<string>());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [showPreventivoToast, setShowPreventivoToast] = useState(false);
  const [preventivoToastHiding, setPreventivoToastHiding] = useState(false);
  const preventivoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showResetToast, setShowResetToast] = useState(false);
  const [resetToastHiding, setResetToastHiding] = useState(false);
  const resetToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for 'open-legal' CustomEvent from CookieBanner
  useEffect(() => {
    const cb = (e: Event) => {
      const doc = (e as CustomEvent).detail;
      if (doc) setLegalDoc(getLegalDoc(lang, doc) ?? null);
    };
    window.addEventListener('open-legal', cb);
    return () => window.removeEventListener('open-legal', cb);
  }, [lang]);

  // Cleanup highlight timer on unmount
  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (preventivoToastTimer.current) clearTimeout(preventivoToastTimer.current);
    if (resetToastTimer.current) clearTimeout(resetToastTimer.current);
    if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
  }, []);

  // Keep Lenis in sync with the actual page height. InfiniteSlider renders
  // 4 copies of its children, images lazy-load, and LazySection mounts content
  // dynamically — all of which change the document height after initial paint.
  // During active scroll the resize is skipped (recalibrating mid-gesture is
  // the #1 cause of section-skipping jumps). A 300ms debounce after the last
  // scroll event catches any height changes that accumulated during the gesture.
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let scrollStoppedTimer: ReturnType<typeof setTimeout> | undefined;
    const isScrollingRef = { current: false };

    // Debounced scroll-stop detector: resets on every 'scroll' event.
    // When scrolling finally stops for 300ms, allow one resize to catch up.
    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollStoppedTimer) clearTimeout(scrollStoppedTimer);
      scrollStoppedTimer = setTimeout(() => {
        scrollStoppedTimer = undefined;
        isScrollingRef.current = false;
        lenis.current?.resize();
      }, 300);
    };

    lenis.current?.on('scroll', onScroll);

    const ro = new ResizeObserver(() => {
      if (isScrollingRef.current) return; // never resize mid-scroll
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        lenis.current?.resize();
      }, 400);
    });
    ro.observe(document.body);

    return () => {
      lenis.current?.off('scroll', onScroll);
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      if (scrollStoppedTimer) clearTimeout(scrollStoppedTimer);
    };
  }, []);
  const [isMonthly, setIsMonthly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('Tutti');
  const [projectsPage, setProjectsPage] = useState(0);
  const [tooltipInfo, setTooltipInfo] = useState<{ text: string; el: HTMLElement; hiding?: boolean } | null>(null);
  const hideTooltipTimerRef = useRef<number | null>(null);
  const ctaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [ctaHiding, setCtaHiding] = useState(false);
  const [ctaDocked, setCtaDocked] = useState(false); // true = docked at top with inverted curve
  const ctaDockedRef = useRef(false);
  const ctaHidingRef = useRef(false);
  // Keep the ref in sync so callbacks (scroll, timer) always read the latest value.
  useEffect(() => { ctaDockedRef.current = ctaDocked; }, [ctaDocked]);

  // ── CTA tooltip: always shows on hover (removed localStorage gate) ──
  const [showCtaTooltip] = useState(true);
  const lastScrollYRef = useRef(0);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Wait for splash screen to finish before starting entrance animations ──
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const cb = () => setSplashDone(true);
    window.addEventListener('splash-complete', cb);
    return () => window.removeEventListener('splash-complete', cb);
  }, []);

  // Hide bottom ProgressiveBlur when scrolled to the very bottom — the blur
  // otherwise covers the footer and modals, making them unreadable.
  // Must use Lenis scroll position (not window.scrollY) because Lenis
  // disables native scrolling and manages its own virtual scroll.
  const [blurBottomHidden, setBlurBottomHidden] = useState(false);
  useEffect(() => {
    const check = () => {
      const l = lenis.current;
      if (!l) return;
      setBlurBottomHidden(l.scroll >= l.limit - 20);
    };
    check();
    lenis.current?.on('scroll', check);
    return () => { lenis.current?.off('scroll', check); };
  }, []);

  // ── Hide CTA with fade-out + slide-down animation ──
  const hideCta = useCallback(() => {
    if (ctaHidingRef.current) return; // Already hiding, don't restart timer
    ctaHidingRef.current = true;
    if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
    setCtaHiding(true);
    ctaTimerRef.current = setTimeout(() => {
      setCtaVisible(false);
      setCtaHiding(false);
      ctaHidingRef.current = false;
    }, 200);
  }, []);

  // ── Reset the 5s inactivity timer — never hides docked CTA ──
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (window.scrollY < 300 || ctaDockedRef.current) return;
      hideCta();
    }, 5000);
  }, [hideCta]);
  const [chatMessage, setChatMessage] = useState('');
  // Fail closed: until the server confirms availability, don't show a
  // misleading green indicator.
  const [isOnline, setIsOnline] = useState(false);

  // Availability is controlled from the Master Portal or Telegram and is
  // polled lightly so the public widget reflects changes without an open SSE
  // connection for every visitor.
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refreshAvailability = async () => {
      // Never stack two polls: if a request is still hanging (e.g. hijacked
      // by a browser extension), skip this tick instead of piling up.
      if (inFlight || !active) return;
      inFlight = true;
      // Manual AbortController instead of AbortSignal.timeout(): when a browser
      // extension hijacks fetch, the timeout signal can fire with no abort
      // listeners attached and Chrome reports an uncaught "signal timed out".
      // controller.abort() fails the request silently — the catch fails closed
      // and the poll cycle keeps running.
      const controller = new AbortController();
      // Absorb the abort event so Chrome never logs "signal is aborted
      // without reason" even when a browser extension hijacks the fetch.
      controller.signal.addEventListener('abort', () => {}, { once: true });
      const timer = setTimeout(() => {
        try { controller.abort(); } catch { /* noop when fetch already completed */ }
      }, 8000);
      try {
        // .catch(() => null) absorbs hijacked fetch rejections from browser
        // extensions (uBlock Origin, frame_ant, etc.) before they bubble to
        // React's scheduler as unhandled promise rejections.
        const response = await fetch('/api/availability', {
          cache: 'no-store',
          signal: controller.signal,
        }).catch(() => null);
        // null = extension hijack or network failure — fail closed
        if (!response || !response.ok) {
          if (active) setIsOnline(false);
          return;
        }
        const data = await response.json() as { isOnline?: unknown };
        if (!active) return;
        // A successful response with an invalid payload is not a trustworthy
        // availability signal either; fail closed instead of retaining green.
        setIsOnline(data.isOnline === true);
      } catch (err) {
        // controller.abort() produces an AbortError — this is the expected
        // 8s dead‑man timeout, not a real failure. Only fail closed for
        // actual network / server errors.
        if (active && (err as Error)?.name !== 'AbortError') setIsOnline(false);
      } finally {
        clearTimeout(timer);
        inFlight = false;
      }
    };
    void refreshAvailability();
    const interval = window.setInterval(refreshAvailability, 30_000);
    // Pause polling while the tab is hidden — nobody sees the dot in the
    // background, so there is no point spending network/CPU on it.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshAvailability();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const [messages, setMessages] = useState<{ id: number; text: string; sender: 'client' | 'tia' }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const nextIdRef = useRef(1);
  const welcomeSentRef = useRef(false);
  // This ID is issued by the server and is paired with the HttpOnly chat cookie.
  // Never generate a client-controlled session ID for chat requests.
  const sessionIdRef = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileMountRef = useRef<Promise<(() => void)> | null>(null);
  const lastPollRef = useRef(0);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !turnstileContainerRef.current) return;
    const container = turnstileContainerRef.current;
    const mountPromise = mountTurnstile(container, siteKey).catch(() => () => undefined);
    turnstileMountRef.current = mountPromise;
    return () => {
      mountPromise.then(cleanup => cleanup()).catch(() => undefined);
      turnstileMountRef.current = null;
    };
  }, []);


  /**
   * Prefill the real contact form first, then measure the final layout and scroll
   * to its section. Measuring before React commits these values was the reason
   * the old scrollIntoView landed a little too low.
   */
  const scrollToContatti = (prefill?: { service?: string; name?: string; email?: string; message?: string }, showToast = false) => {
    const filled = new Set<string>();
    const normalizedService = normalizeContactService(prefill?.service);
    if (normalizedService) { setFormService(normalizedService); filled.add('service'); }
    if (prefill?.name) { setFormName(prefill.name); filled.add('name'); }
    if (prefill?.email) { setFormEmail(prefill.email); filled.add('email'); }
    if (prefill?.message) { setFormMessage(stripMarkdown(prefill.message)); filled.add('message'); }

    if (filled.size > 0) {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedFields(filled);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedFields(new Set());
        highlightTimerRef.current = null;
      }, 1800);
    }

    if (showToast) {
      if (preventivoToastTimer.current) clearTimeout(preventivoToastTimer.current);
      setShowPreventivoToast(true);
      setPreventivoToastHiding(false);
      preventivoToastTimer.current = setTimeout(() => {
        setPreventivoToastHiding(true);
        setTimeout(() => {
          setShowPreventivoToast(false);
          setPreventivoToastHiding(false);
          preventivoToastTimer.current = null;
        }, 250);
      }, 3200);
    }

    scrollToElementAfterLayout('contatti', () => lenis.current, { offsetPx: 60 });
  };

  /** Render bot message text. Accepts optional stored prefill from PREVENTIVO parsing. */
  const renderBotMessage = (
    text: string,
    storedPrefill?: Record<string, string>,
    requiresApproval = false,
    messageId?: number,
    approvalState: 'pending' | 'approved' | 'revising' = 'pending',
  ): React.ReactNode => {
    // Extract internal form instructions before sanitizing. The marker is never
    // rendered; it only decides which friendly fields appear below the reply.
    const formMatch = text.match(/\[FORM_REQUIRED:([^\]]+)\]/i);
    const formFields = formMatch ? formMatch[1].split(',').map(field => field.trim()).filter(Boolean) : [];
    // Parse interactive sliders: [SLIDER:key|label|min|max|step|default]
    const sliderMatches = text.match(/\[SLIDER:([^\]]+)\]/gi);
    const sliders = sliderMatches?.map(raw => {
      const inner = raw.slice(8, -1); // strip [SLIDER: and ]
      const [key, label, minStr, maxStr, stepStr, defaultStr] = inner.split('|').map(s => s.trim());
      return { key, label, min: Number(minStr) || 0, max: Number(maxStr) || 100, step: Number(stepStr) || 1, default: Number(defaultStr) || 0 };
    }) ?? [];
    let cleanText = sanitizeBotText(formMatch ? text.replace(formMatch[0], '') : text);
    // Also strip SLIDER markers from display text
    if (sliderMatches) {
      for (const m of sliderMatches) {
        cleanText = cleanText.replace(m, '');
      }
      cleanText = cleanText.trim();
    }
    if (!cleanText && formFields.length === 0 && sliders.length === 0) return null;

    const parts = cleanText.split(SECTION_LINK_RE);
    const processed = parts.map((part, i) => {
      // Check if this part is a #section link
      const sectionMatch = part.match(/^#(.+)$/i);
      if (sectionMatch) {
        const sectionKey = sectionMatch[1].toLowerCase();
        const sectionId = SECTION_IDS[sectionKey];
        if (sectionId) {
          return (
            <span
              key={i}
              onClick={() => scrollToElementAfterLayout(sectionId, () => lenis.current)}
              className="text-teal-400 underline cursor-pointer hover:text-teal-300 transition-colors inline-flex items-center gap-0.5"
            >
              {sectionMatch[1].charAt(0).toUpperCase() + sectionMatch[1].slice(1)}
              <TiaIcon icon={ArrowRight01Icon} size={11} className="inline-block shrink-0 opacity-70 rotate-90" strokeWidth={2} />
            </span>
          );
        }
        return <React.Fragment key={i}>{renderMarkdown(part)}</React.Fragment>;
      }

      // Split non-section parts by URLs (excludes trailing punctuation from link)
      const urlParts = part.split(URL_RE);
      if (urlParts.length === 1) {
        return <React.Fragment key={i}>{renderMarkdown(part)}</React.Fragment>;
      }
      return (
        <React.Fragment key={i}>
          {urlParts.map((token, j) => {
            if (token.match(/^(https?:\/\/|www\.)/i)) {
              const raw = token;
              // Strip trailing punctuation that the greedy regex may have captured
              const trailing = raw.match(/[.,;:!?)]+$/);
              const clean = trailing ? raw.slice(0, -trailing[0].length) : raw;
              const href = clean.startsWith('www.') ? `https://${clean}` : clean;
              return (
                <React.Fragment key={j}>
                  <UrlPreviewCard url={href} label={clean} />
                  {trailing?.[0]}
                </React.Fragment>
              );
            }
            return <React.Fragment key={j}>{token}</React.Fragment>;
          })}
        </React.Fragment>
      );
    });

    // If form marker was found, render inline form below the message
    if (formFields.length > 0 || sliders.length > 0) {
      return (
        <>
          {processed}
          <InlinePreventivoForm
            missingFields={formFields}
            sliders={sliders.length > 0 ? sliders : undefined}
            onSubmit={(data) => {
              // Put collected details in the real form immediately, but keep
              // the visitor in the AI conversation until the quote is complete.
              const { sliders: sliderData, ...formData } = data;
              const filtered = Object.fromEntries(
                Object.entries(formData).filter(([, v]) => v)
              );
              const collected = { ...storedPrefill, ...filtered };
              // Include slider values as stringified context for the AI
              if (sliderData && Object.keys(sliderData).length > 0) {
                collected._sliders = JSON.stringify(sliderData);
              }
              // Keep these details private to the conversation. The real
              // contact form is populated only after explicit quote approval.
              quoteDraftRef.current = { ...quoteDraftRef.current, ...collected };
              // Continue the quote naturally in the AI chat. The collected
              // fields travel privately in `quoteDraft`; no internal labels or
              // form payload are shown as a user message.
              sendBotMessage('Prepare the personalised quote using the details already collected.', { quoteDraft: quoteDraftRef.current, displayUserMessage: false });
            }}
          />
        </>
      );
    }

    if (requiresApproval && storedPrefill && messageId !== undefined) {
      return (
        <>
          {processed}
          <div className="mt-4 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-3">
            <p className="mb-3 text-xs leading-relaxed text-teal-200/80">{t('bot.quote_review', lang)}</p>
            {approvalState === 'approved' ? (
              <div className="flex items-center gap-2 text-sm font-medium text-teal-300">
                <TiaIcon icon={CheckmarkCircle01Icon} size={17} strokeWidth={2} />
                {t('bot.quote_sent', lang)}
              </div>
            ) : approvalState === 'revising' ? (
              <div className="text-xs text-neutral-400">{t('bot.quote_revision_started', lang)}</div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => approveQuote(messageId, storedPrefill, text)}
                  disabled={approvalSendingId === messageId}
                  className="flex-1 rounded-lg bg-teal-500 px-3 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-teal-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {approvalSendingId === messageId ? t('bot.sending_quote', lang) : t('bot.approve_quote', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => reviseQuote(messageId, storedPrefill)}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-xs font-medium text-neutral-300 transition-colors hover:border-teal-400/30 hover:bg-white/[0.05] hover:text-white"
                >
                  {t('bot.revise_quote', lang)}
                </button>
              </div>
            )}
          </div>
        </>
      );
    }

    return processed;
  };

  // ── Standalone chatbot state (for the #chatbot section) ──
  const [botInput, setBotInput] = useState('');
  const [chatCategory, setChatCategory] = useState<ChatCategory>('software-web');
  // Details collected by the small in-chat form stay in the conversation until
  // the AI finishes the quote. They must not trigger a page jump on their own.
  const quoteDraftRef = useRef<Record<string, string>>({});
  const quoteEmailSentRef = useRef<string | null>(null);
  const [botMessages, setBotMessages] = useState<{
    id: number;
    text: string;
    sender: 'user' | 'bot';
    prefill?: Record<string, string>;
    requiresApproval?: boolean;
    approvalState?: 'pending' | 'approved' | 'revising';
  }[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const [approvalSendingId, setApprovalSendingId] = useState<number | null>(null);
  const approvalSendingRef = useRef<number | null>(null);
  const botNextIdRef = useRef(1);
  const botMessagesRef = useRef<HTMLDivElement>(null);
  const botInputRef = useRef<HTMLTextAreaElement>(null);
  const lastTouchYRef = useRef(0);
  // Track the latest bot message that has suggestion chips — older chips become stale (unclickable)
  const latestSuggestionMsgIdRef = useRef(0);

  // ── Chat persistence: save/restore via sessionStorage with 30-min TTL ──
  const CHAT_STORAGE_KEY = 'tia_bot_chat';
  const CHAT_TTL_MS = 30 * 60 * 1000; // 30 minutes

  // Restore chat on mount if within TTL
  const chatRestoredRef = useRef(false);
  useEffect(() => {
    if (chatRestoredRef.current) return;
    chatRestoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { messages: typeof botMessages; category: ChatCategory; ts: number };
      if (!data?.messages?.length) return;
      if (Date.now() - data.ts > CHAT_TTL_MS) {
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
        return;
      }
      // Restore full conversation — max last 20 messages to bound state size
      setBotMessages(data.messages.slice(-20));
      if (data.category && CHAT_CATEGORY_OPTIONS.some(o => o.value === data.category)) {
        setChatCategory(data.category);
      }
      // Shift the next ID past restored messages so new messages don't collide
      const maxId = data.messages.reduce((max: number, m: { id: number }) => Math.max(max, m.id ?? 0), 0);
      botNextIdRef.current = maxId + 1;
    } catch { /* malformed storage, ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save chat whenever messages change (debounced by rAF)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!chatRestoredRef.current) return; // Don't save before restore attempt
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const data = { messages: botMessages.slice(-30), category: chatCategory, ts: Date.now() };
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data));
      } catch { /* storage full, ignore */ }
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [botMessages, chatCategory]);


  useEffect(() => {
    if (botMessagesRef.current) {
      botMessagesRef.current.scrollTop = botMessagesRef.current.scrollHeight;
    }
  }, [botMessages, botTyping]);

  // Reset the entire chatbot conversation — clears messages and
  // sessionStorage so the user starts fresh.
  const resetChat = useCallback(() => {
    setBotMessages([]);
    setBotTyping(false);
    setBotInput('');
    quoteDraftRef.current = {};
    quoteEmailSentRef.current = null;
    botNextIdRef.current = 1;
    latestSuggestionMsgIdRef.current = 0;
    try { sessionStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }

    // Show reset confirmation toast
    if (resetToastTimer.current) clearTimeout(resetToastTimer.current);
    setShowResetToast(true);
    setResetToastHiding(false);
    resetToastTimer.current = setTimeout(() => {
      setResetToastHiding(true);
      resetToastTimer.current = setTimeout(() => {
        setShowResetToast(false);
        setResetToastHiding(false);
        resetToastTimer.current = null;
      }, 300);
    }, 1800);
  }, []);

  // Chat wheel scroll: data-lenis-prevent tells Lenis to skip this
  // element. We drive scrollTop manually in the React onWheel handler
  // so there's zero conflict with Lenis or the browser.
  const handleChatWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const px = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    const atTop = el.scrollTop <= 0 && px < 0;
    const atBottom = el.scrollHeight - el.clientHeight - el.scrollTop <= 1 && px > 0;
    if (atTop || atBottom) {
      lenis.current?.scrollTo(
        (lenis.current?.scroll ?? window.scrollY) + px,
        { immediate: false },
      );
    } else {
      el.scrollBy({ top: px, behavior: 'instant' });
    }
  }, []);

  const sendBotMessage = (inputOverride?: string, options?: { quoteDraft?: Record<string, string>; displayUserMessage?: boolean }) => {
    const text = (inputOverride ?? botInput).trim();
    if (!text) return;
    const uid = botNextIdRef.current++;
    if (isInappropriateChatMessage(text)) {
      setBotInput('');
      setBotMessages(prev => [
        ...prev,
        ...(options?.displayUserMessage === false ? [] : [{ id: uid, text, sender: 'user' as const }]),
        { id: botNextIdRef.current++, text: t('bot.inappropriate', lang), sender: 'bot' as const },
      ]);
      return;
    }
    setBotInput('');
    setBotTyping(true);

    const replyId = botNextIdRef.current++;
    setBotMessages(prev => [
      ...prev,
      ...(options?.displayUserMessage === false ? [] : [{ id: uid, text, sender: 'user' as const }]),
      { id: replyId, text: '', sender: 'bot' as const },
    ]);

    const msgs = [...botMessages.map(m => ({
      role: m.sender === 'bot' ? 'assistant' as const : 'user' as const,
      content: m.text,
    })), { role: 'user' as const, content: text }];

    secureChatFetch('/api/chat/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: msgs,
        lang,
        category: chatCategory,
        quoteDraft: options?.quoteDraft ?? quoteDraftRef.current,
      }),
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => '');
        // Try to extract error from SSE body, fallback to generic message
        let errMsg = t('bot.error_server', lang);
        // Never surface raw API/server text: it can contain internal
        // implementation details. Keep the visitor-facing error localized.
        try {
          const sseMatch = body.match(/data: (\{.*?\})/);
          if (sseMatch) JSON.parse(sseMatch[1]);
        } catch { /* ignore malformed server output */ }
        setBotMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: errMsg } : m));
        setBotTyping(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const p = t.slice(6);
          if (p === '[DONE]') continue;
          try {
            const parsed = JSON.parse(p);
            const token = parsed?.token || '';
            if (!token) {
              // Error payloads stay internal; the visitor receives the
              // localized fallback below instead of raw server terminology.
              continue;
            }
            // Play notification on the very first token
            if (!full) playNotificationSound();
            full += token;
            setBotMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: sanitizeStreamingBotText(full) } : m));
          } catch { /* skip */ }
        }
      }

      // If stream produced no content, show fallback error
      if (!full) {
        full = t('bot.error_no_response', lang);
      }

      // Parse internal markers only after the complete response has arrived.
      // Neither marker is ever shown in the chat.
      const formRequiredMatch = full.match(/\[FORM_REQUIRED:([^\]]+)\]/i);
      const preventivoMatch = full.match(/\[PREVENTIVO:([\s\S]+?)\]/i);
      let displayText = full;
      let parsedPrefill: Record<string, string> | undefined;
      let requiresApproval = false;
      if (formRequiredMatch) {
        // Keep the private marker in state so renderBotMessage can mount the
        // friendly inline fields; it is stripped before rendering.
        displayText = full;
      } else if (preventivoMatch) {
        try {
          const prefill = JSON.parse(preventivoMatch[1]);
          parsedPrefill = prefill;
          displayText = full.replace(preventivoMatch[0], '').trim();

          // Merge details collected by the in-chat form with the AI marker.
          // The marker wins when the AI has a newer value in the conversation.
          const completePrefill = { ...quoteDraftRef.current, ...prefill };
          const missing: string[] = [];
          if (!completePrefill.name?.trim() || !isValidContactName(completePrefill.name)) missing.push('nome');
          if (!completePrefill.email?.trim() || !isValidContactEmail(completePrefill.email)) missing.push('email');
          if (!completePrefill.service?.trim()) missing.push('servizio');

          if (missing.length > 0) {
            // Fields missing — show the small in-chat form and remain in the chat.
            const missingList = missing.join(',');
            displayText = (displayText || t('bot.preventivo_ready', lang)) +
              `\n\n[FORM_REQUIRED:${missingList}]`;
          } else {
            // The AI has finished the quote: write the actual answer (not just
            // the marker metadata) into the contact message, then scroll only
            // after React commits every prefilled field.
            const finalQuote = sanitizeBotText(displayText || completePrefill.message || '');
            if (!isDetailedQuote(finalQuote)) {
              // Do not email or navigate on a premature/empty marker. Keep the
              // visitor in the conversation and ask the AI to finish properly.
              displayText = `${finalQuote}\n\n${t('bot.quote_not_ready', lang)}`.trim();
            } else {
              // Keep the generated quote in the conversation as a draft. Nothing
              // is sent and the page does not navigate until the visitor explicitly
              // approves it with the action below.
              const quotePrefill = { ...completePrefill, message: finalQuote };
              quoteDraftRef.current = quotePrefill;
              parsedPrefill = quotePrefill;
              requiresApproval = true;
              displayText = finalQuote;
            }
          }
        } catch { /* invalid JSON, ignore */ }
      }
      setBotMessages(prev => prev.map(m => m.id === replyId ? {
        ...m,
        text: displayText,
        prefill: parsedPrefill,
        requiresApproval,
        approvalState: requiresApproval ? 'pending' : undefined,
      } : m));
      setBotTyping(false);
    }).catch(() => {
      setBotMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: t('bot.error_connection', lang) } : m));
      setBotTyping(false);
    });
  };

  const approveQuote = async (messageId: number, prefill: Record<string, string>, quote: string) => {
    const name = prefill.name?.trim() ?? '';
    const email = prefill.email?.trim() ?? '';
    const service = normalizeContactService(prefill.service);
    const finalQuote = sanitizeBotText(quote).trim();

    // Validate again at the final boundary. This protects both the UI action
    // and the server endpoint if the AI returned malformed or inappropriate data.
    if (!isValidContactName(name) || !isValidContactEmail(email) || !service || !isValidContactMessage(finalQuote) || isInappropriateChatMessage(finalQuote) || isInappropriateContactValue(finalQuote)) {
      setBotMessages(prev => [...prev, {
        id: botNextIdRef.current++,
        text: t('bot.quote_invalid', lang),
        sender: 'bot' as const,
      }]);
      return;
    }

    const quoteKey = `${email}|${finalQuote}`;
    const storageKey = `ai_quote_sent:${quoteKey}`;
    if (approvalSendingRef.current === messageId) return;
    approvalSendingRef.current = messageId;
    setApprovalSendingId(messageId);
    if (quoteEmailSentRef.current === quoteKey || sessionStorage.getItem(storageKey) === '1') {
      setBotMessages(prev => prev.map(message => message.id === messageId ? { ...message, approvalState: 'approved' } : message));
      approvalSendingRef.current = null;
      setApprovalSendingId(null);
      return;
    }

    try {
      const response = await secureChatFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, service, message: finalQuote, source: 'ai-quote' }),
      });
      if (!response.ok) throw new Error('quote-send-failed');

      quoteEmailSentRef.current = quoteKey;
      sessionStorage.setItem(storageKey, '1');
      quoteDraftRef.current = { ...prefill, name, email, service, message: finalQuote };
      setBotMessages(prev => prev.map(message => message.id === messageId ? { ...message, approvalState: 'approved' } : message));
      scrollToContatti({ name, email, service, message: finalQuote }, true);
      approvalSendingRef.current = null;
      setApprovalSendingId(null);
    } catch {
      approvalSendingRef.current = null;
      setApprovalSendingId(null);
      setBotMessages(prev => [...prev, {
        id: botNextIdRef.current++,
        text: t('bot.quote_send_error', lang),
        sender: 'bot' as const,
      }]);
    }
  };

  const reviseQuote = (messageId: number, prefill: Record<string, string>) => {
    setBotMessages(prev => prev.map(message => message.id === messageId ? { ...message, approvalState: 'revising' } : message));
    sendBotMessage(t('bot.revise_prompt', lang), {
      quoteDraft: prefill,
      displayUserMessage: true,
    });
    requestAnimationFrame(() => botInputRef.current?.focus());
  };


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Click outside to close chat
  useEffect(() => {
    if (!chatOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (chatWidgetRef.current && !chatWidgetRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chatOpen]);

  // SSE connection for real-time replies from Tia (instead of polling)
  const eventSourceRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (!chatOpen) return;
    let cancelled = false;

    // EventSource cannot send a POST body, so it relies on the same secure
    // session cookie/ID pair. The session is bootstrapped before opening it.
    void ensureChatSession().then((sessionId) => {
      if (cancelled) return;
      sessionIdRef.current = sessionId;
      const es = new EventSource(`/api/chat/stream?sessionId=${encodeURIComponent(sessionId)}&since=${lastPollRef.current}`);
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        // Connection established — no action needed
      });

      es.onmessage = (e) => {
        try {
          const incoming = JSON.parse(e.data);
          if (!Array.isArray(incoming) || incoming.length === 0) return;
          lastPollRef.current = Date.now();
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = incoming.filter((m: any) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs.map((m: any) => ({ id: m.id, text: m.text, sender: 'tia' as const }))];
          });
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        // Browser will automatically reconnect EventSource on error
      };
    }).catch(() => {
      // The live widget can still be opened; sending will show its normal
      // localized error if session bootstrap is unavailable.
    });

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [chatOpen]);

  // ── Start inactivity timer after splash cooldown ──
  useEffect(() => {
    const initial = setTimeout(() => resetInactivityTimer(), 3000);
    return () => {
      clearTimeout(initial);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // ── Keep the CTA strictly above the chatbot ──
  // It must never sit over the chatbot, contact form, or footer links. The
  // position check runs on the same rAF-throttled scroll listener used for the
  // inactivity behavior, so it remains reliable with Lenis and native scroll.
  useEffect(() => {
    let rafId = 0;

    // Three-zone CTA behaviour:
    // 1. Above the chatbot   → bottom, normal curve (ctaDocked=false)
    // 2. Inside the chatbot  → hidden (ctaVisible=false)
    // 3. After the chatbot   → top, inverted curve (ctaDocked=true)
    const syncCtaWithChatbotPosition = () => {
      const chatbot = document.getElementById('chatbot');
      if (!chatbot) return;

      const { top: ct, bottom: cb } = chatbot.getBoundingClientRect();
      const aboveChatbot = ct > window.innerHeight;   // zone 1
      const pastChatbot = cb < 0 || ct < -window.innerHeight * 0.5; // zone 3 (also handles tall sections on mobile)

      if (aboveChatbot) {
        // Zone 1 — normal bottom position.
        if (ctaDockedRef.current) setCtaDocked(false);
        if (ctaHidingRef.current) {
          if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
          ctaHidingRef.current = false;
          setCtaHiding(false);
        }
        if (!ctaVisible) setCtaVisible(true);
        if (window.scrollY >= 300) resetInactivityTimer();
        return;
      }

      if (pastChatbot) {
        // Zone 3 — dock at top with inverted curve.
        if (ctaHidingRef.current) {
          if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
          ctaHidingRef.current = false;
          setCtaHiding(false);
        }
        if (!ctaVisible) setCtaVisible(true);
        if (!ctaDockedRef.current) setCtaDocked(true);
        return;
      }

      // Zone 2 — inside the chatbot section: hide the CTA.
      if (!ctaHidingRef.current && ctaVisible) hideCta();
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        lastScrollYRef.current = window.scrollY;
        syncCtaWithChatbotPosition();
      });
    };

    syncCtaWithChatbotPosition();

    // IntersectionObserver as a secondary source — catches layout shifts
    // that don't produce scroll events (e.g. chatbot content loading).
    const chatbot = document.getElementById('chatbot');
    const observer = chatbot
      ? new IntersectionObserver(() => syncCtaWithChatbotPosition(), { threshold: 0 })
      : null;
    if (chatbot && observer) observer.observe(chatbot);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [ctaVisible, hideCta, resetInactivityTimer]);

  // ── Analytics helper (fire-and-forget) ──
  const logAnalytics = (event: string, text?: string) => {
    void ensureChatSession().then((sessionId) => {
      sessionIdRef.current = sessionId;
      return fetch('/api/analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, event, text }),
      });
    }).catch(() => { });
  };

  // Auto-insert welcome message when chat opens for the first time
  useEffect(() => {
    if (chatOpen && messages.length === 0 && !welcomeSentRef.current) {
      welcomeSentRef.current = true;
      const welcomeId = nextIdRef.current++;
      setMessages([{ id: welcomeId, text: t('chat.welcome', lang), sender: 'tia' }]);
    }
    if (!chatOpen) {
      welcomeSentRef.current = false;
    }
  }, [chatOpen, messages.length, lang]);

  const sendMessage = async () => {
    const text = chatMessage.trim();
    if (!text) return;
    const id = nextIdRef.current++;
    setMessages(prev => [...prev, { id, text, sender: 'client' }]);
    setChatMessage('');
    lastPollRef.current = Date.now();

    // Log analytics
    logAnalytics('message_sent', text);

    try {
      const response = await secureChatFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('chat-send-failed');
      const result = await response.json() as { available?: unknown };

      // Show a localized offline notice when Telegram delivery is paused;
      // the message stays in the session and can still be handled later.
      const autoReplyId = nextIdRef.current++;
      setMessages(prev => {
        const autoReplyText = result.available === false
          ? t('chat.offline_reply', lang)
          : t('chat.auto_reply', lang);
        const alreadyAutoReplied = prev.some(m => m.sender === 'tia' && m.text === autoReplyText);
        if (alreadyAutoReplied) return prev;
        return [...prev, { id: autoReplyId, text: autoReplyText, sender: 'tia' }];
      });
    } catch {
      // Keep the chat UI quiet rather than exposing server/security details.
    }
  };

  const pricing = useMemo(() => isMonthly ? getPricingMonthly(lang) : getPricingOnetime(lang), [isMonthly, lang]);
  const reviews = useMemo(() => getReviews(lang), [lang]);
  const filteredProjects = useMemo(
    () => getProjects(lang).filter((project) => activeFilter === 'Tutti' || project.category === activeFilter),
    [activeFilter, lang]
  );
  const projectPageSize = 6;
  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const projectPage = Math.min(projectsPage, projectTotalPages - 1);
  const pagedProjects = filteredProjects.slice(projectPage * projectPageSize, (projectPage + 1) * projectPageSize);
  const projectNavigationLabel = lang === 'it' ? 'Navigazione progetti' : lang === 'es' ? 'Navegación de proyectos' : 'Project navigation';
  const previousProjectsLabel = lang === 'it' ? 'Progetti precedenti' : lang === 'es' ? 'Proyectos anteriores' : 'Previous projects';
  const nextProjectsLabel = lang === 'it' ? 'Progetti successivi' : lang === 'es' ? 'Proyectos siguientes' : 'Next projects';
  const heroRef = useRef<HTMLDivElement>(null);
  const heroEntranceStartedRef = useRef(false);
  const heroEntranceTweenRef = useRef<gsap.core.Tween | null>(null);

  // .hero-anim has opacity:0 in CSS to prevent a hydration flash (server
  // renders at final position; GSAP moves elements to the offset before the
  // first paint). The splash screen covers everything with z-[99999], and
  // the entrance tween animates opacity back to 1 after splashDone.
  useLayoutEffect(() => {
    const elements = heroRef.current?.querySelectorAll<HTMLElement>('.hero-anim');
    if (!elements?.length) return;

    gsap.set(elements, {
      y: HERO.yOffset,
      scale: HERO.scale,
      filter: `blur(${HERO.blur}px)`,
    });

    return () => {
      heroEntranceTweenRef.current?.kill();
      heroEntranceTweenRef.current = null;
    };
  }, []);

  // Reveal the hero exactly once, immediately after the splash completes.
  // `to()` animates from the already-hidden state, so it never flashes visible
  // and then starts over.
  useEffect(() => {
    if (!splashDone || heroEntranceStartedRef.current) return;
    const elements = heroRef.current?.querySelectorAll<HTMLElement>('.hero-anim');
    if (!elements?.length) return;

    heroEntranceStartedRef.current = true;
    heroEntranceTweenRef.current = gsap.to(elements, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: HERO.duration,
      stagger: HERO.stagger,
      ease: HERO.ease,
      delay: HERO.delay,
      clearProps: 'transform,filter',
    });
  }, [splashDone]);

  const handleTooltipShow = (text: string, el: HTMLElement) => {
    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
    setTooltipInfo({ text, el });
  };
  const handleTooltipHide = () => {
    // Two-phase hide: first set hiding=true (triggers opacity transition), then remove from DOM
    if (hideTooltipTimerRef.current) clearTimeout(hideTooltipTimerRef.current);
    setTooltipInfo(prev => prev ? { ...prev, hiding: true } : null);
    hideTooltipTimerRef.current = window.setTimeout(() => {
      setTooltipInfo(null);
      hideTooltipTimerRef.current = null;
    }, 100);
  };

  // ── Section-level tooltip handlers (for tags, badges, contact icons) ──
  const { getHandlers: getSectionHandlers } = useTooltip(handleTooltipShow, handleTooltipHide, { showDelay: 300, hideDelay: 100 });

  // Common tooltip texts for project tags
  const tagTooltips: Record<string, string> = {
    'Next.js': 'Framework React full-stack per applicazioni web performanti e SEO-friendly.',
    'Tailwind': 'Framework CSS utility-first per design rapidi, consistenti e responsivi.',
    'React': 'Libreria JavaScript per costruire interfacce utente interattive e componibili.',
    'Branding': 'Progettazione e gestione dell\'identità visiva di un brand.',
    'UI Design': 'Progettazione dell\'interfaccia utente per esperienze digitali intuitive.',
    'SEO': 'Ottimizzazione tecnica per motori di ricerca per massimizzare la visibilità.',
    'E-commerce': 'Piattaforme di vendita online con carrello, pagamenti e gestione ordini.',
    'Animazioni': 'Animazioni web fluide con GSAP, Framer Motion e Three.js.',
    'Premiere Pro': 'Montaggio video professionale con Adobe Premiere Pro.',
    'After Effects': 'Motion graphics, VFX e compositing con Adobe After Effects.',
    'Color Grading': 'Correzione e grading colore avanzato per produzioni video.',
    'Sito Professionale': 'Sito web istituzionale con design curato e performance ottimizzate.',
    'Sviluppo': 'Sviluppo full-stack con architetture moderne e scalabili.',
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = new Set<'name' | 'email' | 'message'>();
    if (!isValidContactName(formName)) invalid.add('name');
    if (!isValidContactEmail(formEmail)) invalid.add('email');
    if (!isValidContactMessage(formMessage)) invalid.add('message');
    if (invalid.size > 0) {
      setFormValidationErrors(invalid);
      setFormStatus('idle');
      return;
    }
    setFormValidationErrors(new Set());
    setFormStatus('sending');
    try {
      const res = await secureChatFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name: formName, email: formEmail, message: formMessage, service: formService }),
      });
      if (res.ok) {
        setFormStatus('sent');
        setFormValidationErrors(new Set());
        setFormName(''); setFormEmail(''); setFormMessage(''); setFormService('');
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    }
  };

  // Auto-reset error state after 3 seconds
  useEffect(() => {
    if (formStatus === 'error') {
      const timer = setTimeout(() => setFormStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [formStatus]);



  return (
    <SmoothScrollProvider>
      <MobileGlowActivator>
        <Navbar />
        <ProgressiveBlur
          className="fixed top-0 z-20"
          height="4.5rem"
          position="top"
          blurLevels={[0.5, 1, 2, 4, 8, 16, 32, 64]}
        />
        <div
          className="fixed inset-x-0 bottom-0 z-20 pointer-events-none"
          style={{
            opacity: blurBottomHidden ? 0 : 1,
            transition: 'opacity 0.35s ease',
          }}
        >
          <ProgressiveBlur
            className=""
            height="clamp(6rem, 8vw, 8rem)"
            position="bottom"
            blurLevels={[0.5, 1, 2, 4, 8, 16, 32, 64]}
          />
        </div>
        <div ref={turnstileContainerRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0" />

        <div className="bg-[#010101] text-neutral-200 font-sans">

          {/* ============ HERO ============ */}
          <section ref={heroRef} className="relative h-screen w-full overflow-y-auto sm:overflow-hidden flex items-center bg-[#010101]">
            <div suppressHydrationWarning>
              <Dither
                waveColor={[0.298, 0.608, 0.510]}
                waveSpeed={0.06}
                waveFrequency={8.4}
                waveAmplitude={0.3}
                colorNum={6}
                pixelSize={1}
                enableMouseInteraction={true}
                mouseRadius={0.1}
              />
            </div>

            <div className="relative z-20 text-left px-5 sm:px-12 md:px-20 lg:px-28 max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-[90rem] pointer-events-none">
              <p className="hero-anim mb-2 sm:mb-6">
                <span className="inline-block bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-2xl px-3 sm:px-5 py-1.5 sm:py-2 text-teal-400/90 text-[11px] sm:text-xs md:text-sm tracking-[0.2em] uppercase font-semibold whitespace-nowrap">
                  {t('hero.tag', lang)}
                </span>
              </p>
              <h1 className="hero-anim max-[374px]:text-3xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05]">
                {t('hero.line1', lang)}<br />
                <span className="font-bold text-teal-400"><span className="font-black text-white">{t('hero.line2a', lang)}</span> {t('hero.line2b', lang)} <span className="font-black text-white">{t('hero.line2c', lang)}</span> {t('hero.line2d', lang)}<span className="font-black text-white">{t('hero.line2e', lang)}</span></span>
              </h1>
              <p className="hero-anim mt-3 sm:mt-8 text-white text-sm sm:text-base md:text-lg max-w-md sm:max-w-xl font-medium leading-relaxed relative">
                <span className="absolute inset-0 blur-3xl opacity-60 bg-teal-400/20 rounded-full scale-150 -z-10 pointer-events-none" />                {t('hero.subtitle', lang)}
              </p>
              <div className="hero-anim mt-5 sm:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-5 justify-start items-stretch sm:items-center">
                <button
                  onClick={() => { scrollToContatti(); trackClick('hero_cta_quote'); }}
                  className="w-full sm:w-auto px-6 sm:px-9 py-3 sm:py-4 bg-teal-500 text-white rounded-full text-[14px] sm:text-[15px] font-semibold hover:bg-teal-400 transition-all shadow-xl shadow-teal-500/25 pointer-events-auto tracking-wide inline-flex items-center justify-center gap-2 sm:gap-2.5"
                >
                  <TiaIcon icon={FilePenIcon} size={18} strokeWidth={2} />
                  {t('hero.cta_quote', lang)}
                </button>
                <button
                  onClick={() => { scrollToElementAfterLayout('prezzi', () => lenis.current); trackClick('hero_cta_prices'); }}
                  className="w-full sm:w-auto px-6 sm:px-9 py-3 sm:py-4 bg-white/[0.06] backdrop-blur-lg border border-white/15 text-white rounded-full text-[14px] sm:text-[15px] font-semibold hover:bg-white/15 hover:border-white/30 transition-all shadow-lg shadow-black/20 pointer-events-auto tracking-wide inline-flex items-center justify-center gap-2 sm:gap-2.5"
                >
                  <TiaIcon icon={DollarSignIcon} size={18} strokeWidth={2} />
                  {t('hero.cta_prices', lang)}
                </button>
                <button
                  onClick={() => { scrollToElementAfterLayout('progetti', () => lenis.current); trackClick('hero_cta_work'); }}
                  className="w-full sm:w-auto px-2 sm:px-3 py-2.5 sm:py-4 text-white/80 hover:text-white rounded-full text-[14px] sm:text-[15px] font-medium transition-all inline-flex items-center justify-center gap-2 group pointer-events-auto tracking-wide"
                >
                  {t('hero.cta_work', lang)}
                  <TiaIcon icon={ArrowRight01Icon} size={20} className="transition-transform group-hover:translate-x-1" strokeWidth={2} />
                </button>
              </div>

              {/* ── Inline Stats Row — clienti, risposta, pagamento ── */}
              <div className="hero-anim mt-4 sm:mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5 text-xs sm:text-sm">
                <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-xl px-3 py-2">
                  <HeroGlow stagger={0}><span className="text-teal-400 text-base sm:text-lg font-bold"><CountUp target={15} delay={HERO_COUNTUP_DELAYS[0]} ready={splashDone} className="" />+</span></HeroGlow>
                  <span className="text-white/80">{t('hero.stat_clients', lang)}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-xl px-3 py-2">
                  <HeroGlow stagger={1}><span className="text-teal-400 text-base sm:text-lg font-bold">&lt;<CountUp target={1} delay={HERO_COUNTUP_DELAYS[1]} ready={splashDone} className="" />h</span></HeroGlow>
                  <span className="text-white/80">{t('hero.stat_response', lang)}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-xl px-3 py-2">
                  <HeroGlow stagger={2}><span className="text-teal-400 text-base sm:text-lg font-bold"><CountUp target={30} delay={HERO_COUNTUP_DELAYS[2]} ready={splashDone} className="" />/<CountUp target={30} delay={HERO_COUNTUP_DELAYS[3]} ready={splashDone} className="" />/<CountUp target={40} delay={HERO_COUNTUP_DELAYS[4]} ready={splashDone} className="" /></span></HeroGlow>
                  <span className="text-white/80">{t('hero.stat_payment', lang)}</span>
                </div>
              </div>
            </div>

          </section>

          {/* ============ SERVIZI ============ */}
          <LazySection rootMargin={400} placeholderHeight={800}>
          <section id="servizi" className="py-16 sm:py-24 px-4 bg-[#010101]">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('servizi.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('servizi.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('servizi.subtitle', lang)}
                </p>
              </ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-[54em] mx-auto px-3 relative lg:auto-rows-[minmax(180px,auto)]">
                {/* ═══ DESIGN CARDS ═══ */}
                {/* Card 1 — Brand Identity & Logo */}
                <ScrollReveal delay={0.12} xOffset={-60} className="md:[grid-column:1] md:[grid-row:1] lg:[grid-column:1] lg:[grid-row:1]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={WebDesign01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.design_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-base font-medium mb-1">{t('servizi.brand', lang)}</h3>
                        <p className="text-neutral-500 text-xs leading-relaxed">{t('servizi.brand_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* Card 2 — Graphic Design */}
                <ScrollReveal delay={0.15} xOffset={-40} className="md:[grid-column:2] md:[grid-row:1] lg:[grid-column:2] lg:[grid-row:1]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={ColorsIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.design_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-base font-medium mb-1">{t('servizi.graphic', lang)}</h3>
                        <p className="text-neutral-500 text-xs leading-relaxed">{t('servizi.graphic_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* Card 3 — Sviluppo Web (hero 2×2) */}
                <ScrollReveal delay={0} xOffset={60} className="md:[grid-column:3] md:[grid-row:1_/_span_2] lg:[grid-column:3_/_span_2] lg:[grid-row:1_/_span_2]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] lg:min-h-[420px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={CodeIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.webdev_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-2">{t('servizi.webdev', lang)}</h3>
                        <p className="text-neutral-500 text-sm leading-relaxed">{t('servizi.webdev_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* ═══ WEB DEV CARD ═══ */}
                {/* Card 4 — UI/UX Design (wide 2×1) */}
                <ScrollReveal delay={0.05} className="md:[grid-column:1_/_span_2] md:[grid-row:2] lg:[grid-column:1_/_span_2] lg:[grid-row:2]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={PaintBoardIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.design_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-2">{t('servizi.uiux', lang)}</h3>
                        <p className="text-neutral-500 text-sm leading-relaxed">{t('servizi.uiux_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* ═══ SOFTWARE CARD ═══ */}
                {/* Card 5 — Software & App (large) */}
                <ScrollReveal delay={0.18} xOffset={-50} className="md:[grid-column:1] md:[grid-row:3] lg:[grid-column:1] lg:[grid-row:3]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] lg:min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={MobileProgramming01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.software_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-2">{t('servizi.software', lang)}</h3>
                        <p className="text-neutral-500 text-sm leading-relaxed">{t('servizi.software_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* ═══ VIDEO CARDS ═══ */}
                {/* Card 6 — Video Content */}
                <ScrollReveal delay={0.1} className="md:[grid-column:2] md:[grid-row:3] lg:[grid-column:2_/_span_2] lg:[grid-row:3]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={Video01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.video_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-base font-medium mb-1">{t('servizi.video_content', lang)}</h3>
                        <p className="text-neutral-500 text-xs leading-relaxed">{t('servizi.video_content_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* Card 7 — Post-Production */}
                <ScrollReveal delay={0.22} xOffset={50} className="md:[grid-column:3] md:[grid-row:3] lg:[grid-column:4] lg:[grid-row:3]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={Motion01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.video_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-base font-medium mb-1">{t('servizi.video_post', lang)}</h3>
                        <p className="text-neutral-500 text-xs leading-relaxed">{t('servizi.video_post_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* Card 8 — Hardware & IT (custom service, no pricing tier) */}
                <ScrollReveal delay={0.12} xOffset={-40} className="md:[grid-column:1] md:[grid-row:4] lg:[grid-column:1_/_span_2] lg:[grid-row:4]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={RepairIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.hardware_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-2">{t('servizi.hardware', lang)}</h3>
                        <p className="text-neutral-500 text-sm leading-relaxed">{t('servizi.hardware_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>

                {/* Card 9 — Social Media (custom service, no pricing tier) */}
                <ScrollReveal delay={0.16} xOffset={40} className="md:[grid-column:2] md:[grid-row:4] lg:[grid-column:3_/_span_2] lg:[grid-row:4]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] ${fadeIn ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      {mounted && <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />}
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                      <div className="flex items-center gap-2"><TiaIcon icon={BubbleChatIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">{t('servizi.social_cat', lang)}</span></div>
                      <div>
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-2">{t('servizi.social', lang)}</h3>
                        <p className="text-neutral-500 text-sm leading-relaxed">{t('servizi.social_desc', lang)}</p>
                      </div>
                    </div>
                  </BorderGlow></TiltCard>)}</DotGridCard>
                </ScrollReveal>
              </div>
            </div>
          </section>
          </LazySection>

          {/* ============ PREZZI ============ */}
          <LazySection rootMargin={400} placeholderHeight={900}>
          <section id="prezzi" className="py-16 sm:py-24 px-4 bg-[#050505]">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-12">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('prezzi.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('prezzi.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('prezzi.subtitle', lang)}
                </p>
              </ScrollReveal>

              {/* ── Toggle ── */}
              <div className="flex justify-center mb-16">
                <div className="inline-flex bg-white/5 rounded-full p-1 border border-white/10">
                  <button
                    onClick={() => setIsMonthly(false)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!isMonthly ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    {t('prezzi.onetime', lang)}
                  </button>
                  <button
                    onClick={() => setIsMonthly(true)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${isMonthly ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    {t('prezzi.monthly', lang)}
                  </button>
                </div>
              </div>

              {/* ── Data-driven pricing cards ── */}
              {pricing.map((cat, ci) => (
                <div key={ci} className={ci < pricing.length - 1 ? 'mb-16' : ''}>
                  <h3 className="text-white text-xl font-semibold mb-2 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    {cat.label}
                  </h3>
                  <p className="text-neutral-500 text-sm mb-8 ml-5">{cat.subtitle}</p>
                  <StaggerReveal stagger={STAGGER_BY_SECTION.prezzi} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cat.tiers.map((tier, ti) => (
                      <PriceCard
                        key={ti}
                        title={tier.title}
                        price={tier.price}
                        priceLabel={tier.priceLabel}
                        period={tier.period}
                        popular={tier.popular}
                        premium={tier.premium}
                        description={tier.description}
                        features={tier.features}
                        delivery={tier.delivery}
                        hours={tier.hours}
                        onTooltipShow={handleTooltipShow}
                        onTooltipHide={handleTooltipHide}
                        onRequestQuote={(title) => scrollToContatti({ service: title })}
                      />
                    ))}
                  </StaggerReveal>
                </div>
              ))}
            </div>
          </section>
          </LazySection>

          {/* ── Tooltip position follows scroll ── */}
          {tooltipInfo && typeof document !== 'undefined' && typeof window !== 'undefined' && createPortal(
            <TooltipContent text={tooltipInfo.text} el={tooltipInfo.el} hiding={tooltipInfo.hiding} />,
            document.body
          )}

          {/* ============ PROGETTI ============ */}
          <LazySection rootMargin={700} placeholderHeight={600}>
          <section id="progetti" className="py-16 sm:py-24 px-4 bg-[#050505]" style={{ contain: 'paint style' } as React.CSSProperties}>
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('progetti.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('progetti.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('progetti.subtitle', lang)}
                </p>
              </ScrollReveal>

              {/* ── Filter Buttons ── */}
              <div className="flex justify-center gap-2 sm:gap-3 mb-12 flex-wrap">
                {['Tutti', 'Design', 'Sviluppo', 'Video'].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setActiveFilter(f);
                      setProjectsPage(0);
                    }}
                    className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${activeFilter === f
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]'
                      }`}
                  >
                    {f === 'Tutti' ? t('progetti.filter_all', lang) : f === 'Design' ? t('servizi.design_cat', lang) : f === 'Sviluppo' ? t('servizi.webdev_cat', lang) : t('servizi.video_cat', lang)}
                  </button>
                ))}
              </div>

              <StaggerReveal key={`${activeFilter}-${projectsPage}`} stagger={STAGGER_BY_SECTION.progetti} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedProjects.map((project) => (
                  <div key={project.id} className="cursor-pointer" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 380px' } as React.CSSProperties} onClick={() => setSelectedProject(project)}>
                    <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="group">
                      <div className="bg-[#0a0a0a] rounded-[20px]">
                        <div className="relative aspect-video w-full bg-[#0a0a0a] p-3">
                          <div className="w-full h-full overflow-hidden rounded-xl">
                            <picture>
                              {project.thumbnail.startsWith('/uploads/') && !project.thumbnail.startsWith('/uploads/design-works/') && (
                                <>
                                  <source srcSet={project.thumbnail.replace('.png', '.avif')} type="image/avif" />
                                  <source srcSet={project.thumbnail.replace('.png', '.webp')} type="image/webp" />
                                </>
                              )}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={project.thumbnail}
                                alt={project.title}
                                loading="lazy"
                                draggable="false"
                                onError={(e) => {
                                  if (project.isVideo) {
                                    (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/rc6GzCBa2LY/hqdefault.jpg';
                                  }
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                              />
                            </picture>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-lg font-medium text-white group-hover:text-teal-400 transition-colors">{project.title}</h3>
                          <p className="text-neutral-400 text-sm mt-2 line-clamp-2 leading-relaxed">{project.description}</p>
                          {project.tags && (
                            <div className="flex gap-2 flex-wrap mt-4">
                              {project.tags.map((t) => (
                                <span
                                  key={t}
                                  {...(tagTooltips[t] ? getSectionHandlers(tagTooltips[t]) : {})}
                                  className={`bg-white/5 text-neutral-400 text-xs px-2.5 py-1 rounded-lg ${tagTooltips[t] ? 'cursor-help' : ''}`}
                                >{t}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-3 mt-5">
                            {project.url && <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10 text-white hover:bg-white/5 inline-flex items-center justify-center gap-2"
                            >
                              {project.isVideo ? t('progetti.watch', lang) : t('progetti.visit', lang)}
                              <TiaIcon icon={project.isVideo ? PlayIcon : ExternalLinkIcon} size={16} strokeWidth={2} />
                            </a>}
                            <button
                              onClick={(e) => { e.stopPropagation(); scrollToContatti({ service: project.title, message: `Interesse per il progetto: ${project.title}` }); }}
                              className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium transition-all bg-teal-600 text-white hover:bg-teal-500"
                            >
                              {t('progetti.quote', lang)}
                            </button>
                          </div>
                        </div>
                      </div>
                    </BorderGlow>
                  </div>
                ))}
              </StaggerReveal>

              {projectTotalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-4" aria-label={projectNavigationLabel}>
                  <button
                    type="button"
                    onClick={() => setProjectsPage(Math.max(0, projectPage - 1))}
                    disabled={projectPage === 0}
                    aria-label={previousProjectsLabel}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white transition-all hover:border-teal-400/50 hover:bg-teal-400/10 disabled:pointer-events-none disabled:opacity-25"
                  >
                    <TiaIcon icon={ArrowRight01Icon} size={18} className="-rotate-180" strokeWidth={2} />
                  </button>
                  <span className="min-w-20 text-center text-xs font-medium tracking-[0.18em] text-neutral-500">
                    {projectPage + 1} / {projectTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProjectsPage(Math.min(projectTotalPages - 1, projectPage + 1))}
                    disabled={projectPage >= projectTotalPages - 1}
                    aria-label={nextProjectsLabel}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white transition-all hover:border-teal-400/50 hover:bg-teal-400/10 disabled:pointer-events-none disabled:opacity-25"
                  >
                    <TiaIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          </section>
          </LazySection>

          {/* ============ CHI SONO ============ */}
          <LazySection rootMargin={800} placeholderHeight={1200}>
          <section id="chisono" className="relative py-16 sm:py-24 px-4 bg-[#010101] overflow-x-clip overflow-y-visible">
            {/* Content layer above the terminal */}
            <div className="relative z-10 max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('chisono.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Tia Chinaglia</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('chisono.bio', lang)}
                </p>
              </ScrollReveal>
            </div>

            {/* ── Horizontal skill rows ── */}
            <div className="flex flex-col gap-8">
              {[
                {
                  id: 'design',
                  speed: '50s',
                  direction: 'right' as const,
                  titleKey: 'chisono.skills_design',
                  skills: [
                    { name: 'Figma', Icon: FigmaIcon },
                    { name: 'Adobe Photoshop', Icon: AdobePhotoshopIcon },
                    { name: 'Adobe Illustrator', Icon: AdobeIllustratorIcon },
                    { name: 'Brand Identity', Icon: WebDesign01Icon },
                    { name: 'Grafica Social & Print', Icon: LayoutGridIcon },
                    { name: 'UI/UX & Prototipi', Icon: LayersIcon },
                  ],
                },
                {
                  id: 'webdev',
                  speed: '55s',
                  direction: 'left' as const,
                  titleKey: 'chisono.skills_webdev',
                  skills: [
                    { name: 'React / Next.js', Icon: ReactIcon },
                    { name: 'Vue.js', Icon: CodeFolderIcon },
                    { name: 'TypeScript', Icon: Typescript01Icon },
                    { name: 'JavaScript', Icon: JavaScriptIcon },
                    { name: 'Node.js / API', Icon: ServerStack01Icon },
                    { name: 'TailwindCSS / GSAP', Icon: TailwindcssIcon },
                    { name: 'Three.js / WebGL', Icon: ThreeDViewIcon },
                    { name: 'HTML / CSS', Icon: CodeIcon },
                  ],
                },
                {
                  id: 'backend',
                  speed: '52s',
                  direction: 'right' as const,
                  titleKey: 'chisono.skills_backend',
                  skills: [
                    { name: 'Python', Icon: PythonIcon },
                    { name: 'C / C++', Icon: CProgrammingIcon },
                    { name: 'Java', Icon: JavaIcon },
                    { name: 'PHP', Icon: PhpIcon },
                    { name: 'Ruby', Icon: DiamondIcon },
                    { name: 'Kotlin', Icon: MobileProgramming01Icon },
                  ],
                },
                {
                  id: 'ai',
                  speed: '48s',
                  direction: 'left' as const,
                  titleKey: 'chisono.skills_ai',
                  skills: [
                    { name: 'Intelligenza Artificiale', Icon: ArtificialIntelligence01Icon },
                    { name: 'LLM / GPT', Icon: ChatGptIcon },
                    { name: 'n8n', Icon: WorkflowCircle01Icon },
                    { name: 'Claude Code', Icon: ClaudeIcon },
                    { name: 'Automazione workflow', Icon: WorkflowSquare01Icon },
                    { name: 'AI Agents', Icon: Robot01Icon },
                  ],
                },
                {
                  id: 'video',
                  speed: '46s',
                  direction: 'right' as const,
                  titleKey: 'chisono.skills_visual',
                  skills: [
                    { name: 'Adobe Premiere Pro', Icon: AdobePremierIcon },
                    { name: 'Adobe After Effects', Icon: AdobeAfterEffectIcon },
                    { name: 'DaVinci Resolve', Icon: FilmRoll01Icon },
                    { name: 'Final Cut Pro', Icon: Scissor01Icon },
                    { name: 'Color Grading', Icon: ColorsIcon },
                    { name: 'Motion Graphics', Icon: Motion01Icon },
                  ],
                },
                {
                  id: 'hardware',
                  speed: '58s',
                  direction: 'left' as const,
                  titleKey: 'chisono.skills_it',
                  skills: [
                    { name: 'Assemblaggio Hardware', Icon: CpuIcon },
                    { name: 'Riparazioni PC', Icon: RepairIcon },
                    { name: 'Git / GitHub', Icon: Github01Icon },
                    { name: 'Docker', Icon: ContainerIcon },
                    { name: 'Linux / Terminale', Icon: TerminalIcon },
                    { name: 'Blender', Icon: ThreeDViewIcon },
                  ],
                },
              ].map((row) => {
                // Double the skills array so 4 copies produce enough width
                // for seamless looping even on ultrawide screens (no gaps)
                const doubled = [...row.skills, ...row.skills];
                return (
                  <div key={row.id} className="w-full relative">
                    <div className="skill-line" style={{ paddingLeft: SKILL_TITLE_OFFSET, '--skill-line-offset': SKILL_TITLE_OFFSET } as React.CSSProperties}>
                      <ScrollReveal
                        xOffset={-28}
                        yOffset={0}
                        duration={0.65}
                        className="flex items-center gap-3 mb-2"
                      >
                        <span className={`w-2 h-2 rounded-full bg-teal-400 ${pulsedDots.has(row.id) ? 'animate-dot-pulse' : ''}`} />
                        <TypewriterText text={t(row.titleKey, lang)} speed={35} delay={400} onComplete={() => setPulsedDots(prev => new Set(prev).add(row.id))} className="text-white text-sm font-semibold" />
                      </ScrollReveal>
                    </div>
                    {/* Keep the track paintable on the vertical axis. A CSS mask would
                        clip transformed skill cards even with overflow-visible, so the
                        edge fade is rendered as non-interactive overlays instead. */}
                    <div className="px-3">
                      <div className="marquee-edge-viewport relative overflow-visible py-3">
                        {/* Wide opaque side curtains: keep the outer card copies
                          hidden while preserving a generous clear window in the center. */}
                        <div
                          aria-hidden="true"
                          className="marquee-edge-curtain marquee-edge-curtain--left"
                          style={{ '--marquee-edge-bg': '#010101', '--marquee-edge-fade': 'rgba(1, 1, 1, 0.86)' } as React.CSSProperties}
                        />
                        <div
                          aria-hidden="true"
                          className="marquee-edge-curtain marquee-edge-curtain--right"
                          style={{ '--marquee-edge-bg': '#010101', '--marquee-edge-fade': 'rgba(1, 1, 1, 0.86)' } as React.CSSProperties}
                        />
                        <InfiniteSlider
                          gap={12}
                          duration={parseFloat(row.speed)}
                          durationOnHover={Math.round(parseFloat(row.speed) * 0.4)}
                          reverse={row.direction === 'right'}
                          overflowY="visible"
                        >
                          {doubled.map((skill, i) => (
                            <div key={`${skill.name}-${i}`} className="shrink-0 overflow-visible"><div className="relative hover:z-20" style={{ transition: 'box-shadow 0.3s ease' }}>
                              <BorderGlow
                                borderRadius={16}
                                glowRadius={22}
                                glowIntensity={1.6}
                                edgeSensitivity={0}
                                backgroundColor="#0a0a0a"
                                className="shrink-0 group"
                              >
                                <div className="bg-white/[0.04] rounded-2xl px-5 py-3 flex items-center gap-3 flex-shrink-0 transition-colors duration-300 group-hover:bg-white/[0.08] cursor-default">
                                  <TiaIcon icon={skill.Icon} size={18} className="text-teal-400" />
                                  <span className="text-neutral-300 text-sm font-medium whitespace-nowrap group-hover:text-white transition-colors">{skill.name}</span>
                                </div>
                              </BorderGlow>
                            </div></div>
                          ))}
                        </InfiniteSlider>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ============ CHATBOT ============ */}
          <section id="chatbot" className="py-16 sm:py-24 px-4 bg-[#010101]">
            <div className="max-w-3xl mx-auto">
              <div
                id="chatbot-heading"
                className="scroll-mt-[9rem]"
                style={{ scrollMarginTop: '9rem' }}
              >
                <ScrollReveal className="text-center mb-16" start="top 85%" end="bottom 25%">
                  <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Preventivo</p>
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('chatbot.title', lang)}</h2>
                  <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                    {t('chatbot.subtitle', lang)}
                  </p>
                </ScrollReveal>
              </div>
              <BorderGlow
                continuousHover
                borderRadius={24}
                glowRadius={28}
                glowIntensity={1.4}
                edgeSensitivity={0}
                backgroundColor="#0f0f0f"
                className="[&_.border-glow-inner]:!overflow-visible"
              >
                <div
                  className="p-0 relative flex flex-col bg-[#0f0f0f] backdrop-blur-xl overflow-hidden rounded-3xl"
                  style={{
                    // Keep the desktop proportion, but never exceed the usable
                    // dynamic viewport on short mobile screens (e.g. iPhone SE).
                    maxHeight: 'min(70vh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2rem))',
                  }}
                >
                  {/* macOS-style title bar */}
                  <div className="flex items-center px-5 py-3 border-b border-white/[0.06] shrink-0">
                    {/* Traffic light dots */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                      <span className="w-3 h-3 rounded-full bg-[#fdbc40]" />
                      <span className="w-3 h-3 rounded-full bg-[#2dd4bf]" />
                    </div>
                    {/* Title — centered */}
                    <span className="flex-1 text-center text-xs font-medium text-neutral-400 tracking-wide">{t('chat.ai_title', lang)}</span>
                    {/* Reset button — starts a fresh conversation */}
                    <button
                      type="button"
                      onClick={resetChat}
                      title={lang === 'it' ? 'Avvia una nuova chat — la conversazione corrente verrà eliminata' : lang === 'es' ? 'Iniciar nuevo chat — se eliminará la conversación actual' : 'Start a new chat — the current conversation will be deleted'}
                      className="shrink-0 rounded-full border border-white/[0.08] p-1.5 text-neutral-500 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-neutral-300"
                      aria-label={lang === 'it' ? 'Nuova chat' : lang === 'es' ? 'Nueva chat' : 'New chat'}
                    >
                      <TiaIcon icon={FilePenIcon} size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                  {/* Chat messages */}
                  <div
                    ref={botMessagesRef}
                    data-lenis-prevent
                    data-lenis-prevent-touch
                    onWheel={handleChatWheel}
                    onTouchStart={(e) => {
                      // Track initial touch Y for delta calculation in onTouchMove
                      lastTouchYRef.current = e.touches[0]?.clientY ?? 0;
                    }}
                    onTouchMove={(e) => {
                      const touchY = e.touches[0]?.clientY ?? 0;
                      const deltaY = lastTouchYRef.current - touchY;
                      lastTouchYRef.current = touchY;

                      const el = e.currentTarget;
                      const atTop = el.scrollTop <= 1;
                      const atBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 2;

                      // At the top pulling down (deltaY < 0) or at the bottom
                      // pushing up (deltaY > 0): prevent native rubber-banding
                      // and delegate to Lenis for page scroll instead of letting
                      // the overscroll dead-end in Lenis' virtual body.
                      if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
                        e.preventDefault();
                        lenis.current?.scrollTo(
                          (lenis.current?.scroll ?? window.scrollY) + deltaY,
                          { immediate: true },
                        );
                      }
                    }}
                    className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-5 md:p-6 mb-4 h-[50vh] min-h-[320px] scroll-smooth"
                  >
                    {botMessages.length === 0 && !botTyping && (
                      <div className="flex-1 flex items-center justify-center min-h-[280px]">
                        <div className="text-center select-none">
                          <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
                            {t('chat.bot_empty', lang)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Compute the latest message ID with suggestion chips once (O(n)),
                        then the map uses the ref to determine staleness per-message (O(1)). */}
                    {(() => {
                      let latestSuggId = 0;
                      for (const m of botMessages) {
                        if (m.sender === 'bot' && m.text && /\[SUGGESTIONS:([^\]]+)\]/i.test(m.text)) {
                          latestSuggId = Math.max(latestSuggId, m.id);
                        }
                      }
                      latestSuggestionMsgIdRef.current = latestSuggId;
                      return null; // Side-effect only, renders nothing
                    })()}
                    {botMessages.map((msg) => {
                      // Extract suggestion chips from bot messages
                      const suggMatch = msg.sender === 'bot' && msg.text ? msg.text.match(/\[SUGGESTIONS:([^\]]+)\]/i) : null;
                      const suggestions = suggMatch ? suggMatch[1].split('|').map(s => s.trim()).filter(Boolean) : [];
                      return (<div key={msg.id}>
                      <div
                        className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'bot' && (
                          <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-1">
                            <TiaIcon icon={BubbleChatIcon} size={16} className="text-teal-400" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.sender === 'user'
                            ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
                            : 'bg-white/[0.04] text-neutral-200 rounded-2xl rounded-bl-sm'
                            }`}
                        >
                          {msg.sender === 'bot' && msg.text
                            ? renderBotMessage(msg.text, msg.prefill, msg.requiresApproval, msg.id, msg.approvalState)
                            : (msg.text || (
                              <span className="flex gap-1.5 py-1">
                                <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            ))}
                        </div>
                        {msg.sender === 'user' && (
                          <div className="w-9 h-9 rounded-full bg-teal-600/30 flex items-center justify-center shrink-0 mt-1">
                            <TiaIcon icon={UserIcon} size={16} className="text-teal-300" />
                          </div>
                        )}
                      </div>
                      {/* Suggestion chips — only the latest bot message's chips are clickable;
                           older ones become stale (gray, non-interactive). */}
                      {suggestions.length > 0 && (() => {
                        // Latest sugg ID is computed once above the map for O(n) perf
                        const isStale = msg.id !== latestSuggestionMsgIdRef.current;
                        return (
                          <div className="flex gap-2 flex-wrap mt-2 ml-12">
                            {suggestions.map((sugg, idx) => (
                              isStale ? (
                                <span
                                  key={idx}
                                  className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-600 cursor-default"
                                >
                                  {sugg}
                                </span>
                              ) : (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setBotInput(sugg);
                                    setTimeout(() => sendBotMessage(sugg), 50);
                                  }}
                                  className="shrink-0 rounded-full border border-teal-400/30 bg-teal-400/[0.08] px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-400/20 hover:border-teal-400/50 hover:text-teal-200 transition-all"
                                >
                                  {sugg}
                                </button>
                              )
                            ))}
                          </div>
                        );
                      })()}
                      </div>);
                    })}



                  </div>

                  {/* Specialization selector — single category at a time */}
                  <div className="border-t border-white/[0.06] px-4 pt-3 sm:px-5 md:px-6">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-400/80">{t('chat.category_label', lang)}</span>
                      <span className="text-[10px] text-neutral-600">{t('chat.category_single', lang)}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-custom" role="radiogroup" aria-label={t('chat.category_label', lang)}>
                      {CHAT_CATEGORY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={chatCategory === option.value}
                          onClick={() => setChatCategory(option.value)}
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all touch-manipulation ${chatCategory === option.value
                            ? 'border-teal-400/50 bg-teal-400/15 text-teal-300 shadow-[0_0_14px_rgba(45,212,191,0.12)]'
                            : 'border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-200'
                            }`}
                        >
                          {t(option.labelKey, lang)}
                        </button>
                      ))}
                    </div>
                    <p className="pb-3 text-[11px] leading-relaxed text-neutral-500">{t(CHAT_CATEGORY_OPTIONS.find(option => option.value === chatCategory)?.exampleKey ?? 'chat.example_software_web', lang)}</p>
                  </div>

                  {/* Input */}
                  <div className="flex items-end gap-2 px-4 pb-4 sm:px-5 sm:pb-5 md:px-6 md:pb-6">
                    <textarea
                      ref={botInputRef}
                      value={botInput}
                      onChange={(e) => setBotInput(e.target.value)}
                      placeholder={t(CHAT_CATEGORY_OPTIONS.find(option => option.value === chatCategory)?.placeholderKey ?? 'chat.placeholder_software_web', lang)}
                      rows={1}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/30 resize-none placeholder-neutral-600 overflow-y-auto sm:min-h-[60px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendBotMessage();
                        }
                      }}
                    />
                    <button
                      onClick={() => sendBotMessage()}
                      disabled={!botInput.trim()}
                      className={`h-[42px] w-[42px] rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${botInput.trim() ? 'bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-500/25' : 'bg-neutral-800/60 text-neutral-500'}`}
                      aria-label={t('chat.send', lang)}
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ transform: 'rotate(-20deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                    </button>
                  </div>
                </div>
              </BorderGlow>
            </div>
          </section>
          </LazySection>

          {/* ============ RECENSIONI ============ */}

          <LazySection rootMargin={400} placeholderHeight={500}>
          <section id="recensioni" className="py-16 sm:py-24 px-4 bg-[#050505]">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('recensioni.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('recensioni.title', lang)}</h2>
              </ScrollReveal>

              {/* ── Two-column opposing vertical scrollers ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative h-[400px] sm:h-[540px] overflow-hidden py-5">
                {/* Fade top & bottom */}
                <div className="absolute top-0 left-0 right-0 h-16 z-20 pointer-events-none bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-16 z-20 pointer-events-none bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />                {/* ── Left column — scrolls up ── */}                 <div className="overflow-visible py-5 -my-5">
                  <InfiniteSlider
                    gap={16}
                    duration={45}
                    durationOnHover={18}
                    direction="vertical"
                    glowBleed={30}
                  >
                    {reviews.slice(0, 3).map((review, idx) => (
                      <BorderGlow key={`left-${idx}`} continuousHover borderRadius={20} glowRadius={25} glowIntensity={2.0} backgroundColor="#050505" edgeSensitivity={0} className="w-full">
                        <div className="p-5 sm:p-6">
                          <div className="flex gap-1 mb-3">
                            {Array.from({ length: review.stars }).map((_, i) => (
                              <svg key={i} aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                          </div>
                          <p className="text-neutral-300 text-sm leading-relaxed mb-3 italic">&ldquo;{review.text}&rdquo;</p>
                          <p className="text-white font-medium text-sm">{review.name}</p>
                          <p className="text-neutral-500 text-xs">{review.role}</p>
                        </div>
                      </BorderGlow>
                    ))}
                  </InfiniteSlider>
                </div>
                {/* ── Right column — scrolls down ── */}                 <div className="overflow-visible hidden md:block py-5 -my-5">
                  <InfiniteSlider
                    gap={16}
                    duration={40}
                    durationOnHover={16}
                    direction="vertical"
                    reverse
                    glowBleed={30}
                  >
                    {reviews.slice(3, 6).map((review, idx) => (
                      <BorderGlow key={`right-${idx}`} continuousHover borderRadius={20} glowRadius={25} glowIntensity={2.0} backgroundColor="#050505" edgeSensitivity={0} className="w-full">
                        <div className="p-5 sm:p-6">
                          <div className="flex gap-1 mb-3">
                            {Array.from({ length: review.stars }).map((_, i) => (
                              <svg key={i} aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                          </div>
                          <p className="text-neutral-300 text-sm leading-relaxed mb-3 italic">&ldquo;{review.text}&rdquo;</p>
                          <p className="text-white font-medium text-sm">{review.name}</p>
                          <p className="text-neutral-500 text-xs">{review.role}</p>
                        </div>
                      </BorderGlow>
                    ))}
                  </InfiniteSlider>
                </div>
              </div>
            </div>
          </section>
          </LazySection>

          {/* ============ FAQ ============ */}
          <LazySection rootMargin={400} placeholderHeight={900}>
            <FaqScroller
              mainTitle={t('faq.title', lang)}
              mainSubtitle="Hai dei dubbi? Qui trovi le risposte alle domande più comuni. Se non trovi ciò che cerchi, scrivimi."
              rows={[
                {
                  id: 'row1',
                  speed: '55s',
                  direction: 'right',
                  faqItems: FAQS.slice(0, 3).map((faq, i) => ({ id: `faq-row1-${i}`, question: faq.q, answer: faq.a })),
                },
                {
                  id: 'row2',
                  speed: '48s',
                  direction: 'left',
                  faqItems: FAQS.slice(3, 6).map((faq, i) => ({ id: `faq-row2-${i}`, question: faq.q, answer: faq.a })),
                },
                {
                  id: 'row3',
                  speed: '62s',
                  direction: 'right',
                  faqItems: FAQS.slice(6, 10).map((faq, i) => ({ id: `faq-row3-${i}`, question: faq.q, answer: faq.a })),
                },
              ]}
            />
          </LazySection>

          {/* ============ CONTATTI ============ */}
          <div id="contatti-anchor" className="h-0 w-0 overflow-hidden" aria-hidden="true" />
          <LazySection rootMargin={400} placeholderHeight={900}>
          <section id="contatti" className="py-16 sm:py-24 px-4 bg-[#050505]">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal className="text-center mb-16" start="top 85%" end="bottom 25%">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('contatti.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('contatti.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('contatti.subtitle', lang)}
                </p>
              </ScrollReveal>

              {/* ── Two-column layout: form left, info right ── */}
              <StaggerReveal stagger={STAGGER_BY_SECTION.contatti} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* ── Form column (spans 2) ── */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                  {/* Nome + Email + Servizio row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      className="h-full cursor-text"
                      role="group"
                      tabIndex={0}
                      aria-label={t('contatti.name', lang)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          document.getElementById('form-name')?.focus();
                        }
                      }}
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest('input, textarea, button, a')) {
                          document.getElementById('form-name')?.focus();
                        }
                      }}
                    >
                      <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="h-full">
                        <div className="p-5">
                          <label htmlFor="form-name" className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">{t('contatti.name', lang)}</label>
                          <input id="form-name" type="text" required value={formName} onChange={(e) => { setFormName(e.target.value); setFormValidationErrors(prev => { const next = new Set(prev); next.delete('name'); return next; }); }}
                            aria-invalid={formValidationErrors.has('name')}
                            className={`w-full bg-transparent text-white text-sm focus:outline-none placeholder-neutral-600 border px-2 py-1 -mx-2 -my-1 transition-colors ${formValidationErrors.has('name') ? 'border-red-500/70 bg-red-500/[0.08]' : 'border-transparent'} ${highlightedFields.has('name') ? 'form-highlight' : ''}`}
                            placeholder={t('contatti.placeholder_name', lang)} />
                          {formValidationErrors.has('name') && <p className="mt-2 text-[11px] text-red-400">{t('bot.invalid_name', lang)}</p>}
                        </div>
                      </BorderGlow>
                    </div>
                    <div
                      className="h-full cursor-text"
                      role="group"
                      tabIndex={0}
                      aria-label={t('contatti.email', lang)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          document.getElementById('form-email')?.focus();
                        }
                      }}
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest('input, textarea, button, a')) {
                          document.getElementById('form-email')?.focus();
                        }
                      }}
                    >
                      <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="h-full">
                        <div className="p-5">
                          <label htmlFor="form-email" className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">{t('contatti.email', lang)}</label>
                          <input id="form-email" type="email" required value={formEmail} onChange={(e) => { setFormEmail(e.target.value); setFormValidationErrors(prev => { const next = new Set(prev); next.delete('email'); return next; }); }}
                            aria-invalid={formValidationErrors.has('email')}
                            className={`w-full bg-transparent text-white text-sm focus:outline-none placeholder-neutral-600 border px-2 py-1 -mx-2 -my-1 transition-colors ${formValidationErrors.has('email') ? 'border-red-500/70 bg-red-500/[0.08]' : 'border-transparent'} ${highlightedFields.has('email') ? 'form-highlight' : ''}`}
                            placeholder={t('contatti.placeholder_email', lang)} />
                          {formValidationErrors.has('email') && <p className="mt-2 text-[11px] text-red-400">{t('bot.invalid_email', lang)}</p>}
                        </div>
                      </BorderGlow>
                    </div>
                    <div
                      className="h-full cursor-pointer"
                      onClick={() => {
                        // ServiceSelect stops propagation from its content;
                        // reaching this wrapper therefore means the user hit
                        // the BorderGlow frame itself.
                        document.getElementById('form-service-trigger')?.click();
                      }}
                    >
                      <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="h-full [&_.border-glow-inner]:!overflow-visible relative z-[45]">
                        <ServiceSelect value={formService} onChange={setFormService} highlighted={highlightedFields.has('service')} />
                      </BorderGlow>
                    </div>
                  </div>
                  {/* Messaggio — taller */}
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0}>
                    <div className="p-5">
                      <label htmlFor="form-message" className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">{t('contatti.message', lang)}</label>
                      <textarea id="form-message" required value={formMessage} onChange={(e) => { setFormMessage(e.target.value); setFormValidationErrors(prev => { const next = new Set(prev); next.delete('message'); return next; }); }} rows={8}
                        data-lenis-prevent
                        data-lenis-prevent-wheel
                        onWheel={handleChatWheel}
                        aria-invalid={formValidationErrors.has('message')}
                        className={`w-full bg-transparent text-white text-sm focus:outline-none placeholder-neutral-600 resize-none min-h-[140px] overflow-y-auto border px-2 py-1 -mx-2 -my-1 transition-colors ${formValidationErrors.has('message') ? 'border-red-500/70 bg-red-500/[0.08]' : 'border-transparent'} ${highlightedFields.has('message') ? 'form-highlight' : ''}`}
                        placeholder={t('contatti.placeholder_message', lang)} />
                      {formValidationErrors.has('message') && <p className="mt-2 text-[11px] text-red-400">{t('bot.message_required', lang)}</p>}
                    </div>
                  </BorderGlow>
                  {/* Invia */}
                  <button type="button" onClick={handleContactSubmit} disabled={formStatus === 'sending'}
                    className={`w-full py-3.5 font-medium rounded-xl text-sm transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 ${formStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-500 text-white animate-shake-error'
                      : formStatus === 'sent'
                        ? 'bg-teal-400 text-black hover:bg-teal-300 ring-1 ring-teal-400/40 shadow-lg shadow-teal-400/25'
                        : 'bg-teal-600 hover:bg-teal-500 text-white'
                      }`}>
                    {formStatus === 'sending' ? <><TiaIcon icon={LoaderPinwheelIcon} size={18} className="animate-spin" strokeWidth={2} /> {t('contatti.sending', lang)}</> : formStatus === 'sent' ? <><TiaIcon icon={CheckmarkCircle01Icon} size={18} className="animate-pulse" strokeWidth={2} /> {t('contatti.sent', lang)}</> : formStatus === 'error' ? <><TiaIcon icon={AlertCircleIcon} size={18} className="animate-bounce" strokeWidth={2} /> {t('contatti.error', lang)}</> : <><TiaIcon icon={Mail01Icon} size={18} strokeWidth={2} /> {t('chat.send', lang)}</>}</button>
                </div>

                {/* ── Info sidebar — email, telefono, whatsapp + dettagli ── */}
                <div className="flex flex-col gap-2 h-full">
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="flex-1">
                    <a
                      href="mailto:info@tiadesigns.it"
                      {...getSectionHandlers('Scrivimi direttamente via email. Rispondo entro 24 ore.')}
                      className="flex items-center gap-2.5 p-3 group h-full"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-all">
                        <TiaIcon icon={Mail01Icon} size={15} className="text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-[11px] font-medium truncate">info@tiadesigns.it</p>
                        <p className="text-neutral-500 text-[10px]">Email</p>
                      </div>
                    </a>
                  </BorderGlow>
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="flex-1">
                    <a
                      href="tel:+393318821334"
                      {...getSectionHandlers('Chiamami direttamente. Se non rispondo, ti richiamo appena possibile.')}
                      className="flex items-center gap-2.5 p-3 group h-full"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-all">
                        <TiaIcon icon={CallIcon} size={15} className="text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-[11px] font-medium">+39 331 882 1334</p>
                        <p className="text-neutral-500 text-[10px]">{t('contatti.phone_label', lang)}</p>
                      </div>
                    </a>
                  </BorderGlow>
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="flex-1">
                    <a
                      href="https://wa.me/393318821334"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...getSectionHandlers('Il metodo più rapido. Rispondo in tempo reale su WhatsApp.')}
                      className="flex items-center gap-2.5 p-3 group h-full"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-all">
                        <TiaIcon icon={WhatsappIcon} size={15} className="text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-[11px] font-medium">WhatsApp</p>
                        <p className="text-neutral-500 text-[10px]">{t('contatti.whatsapp_label', lang)}</p>
                      </div>
                    </a>
                  </BorderGlow>
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="flex-1">
                    <div className="p-3 space-y-2 h-full flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <TiaIcon icon={Location01Icon} size={11} className="text-teal-400 shrink-0" strokeWidth={2} />
                        <span>{t('contatti.location', lang)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <TiaIcon icon={Clock01Icon} size={11} className="text-teal-400 shrink-0" strokeWidth={2} />
                        <span>{t('contatti.response_time', lang)}</span>
                      </div>
                    </div>
                  </BorderGlow>
                </div>
              </StaggerReveal>
            </div>
          </section>
          </LazySection>

          {/* ============ FOOTER ============ */}
          <FooterAnimation lang={lang} onOpenLegal={(doc) => setLegalDoc(getLegalDoc(lang, doc) ?? null)} />

          {/* Legal document modal */}
          {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
          {selectedProject && <ProjectModal key={selectedProject.id} project={selectedProject} onClose={() => setSelectedProject(null)} onQuote={(p) => { setSelectedProject(null); scrollToContatti({ service: p.title, message: `Interesse per il progetto: ${p.title}` }); }} />}

          {/* Preventivo auto-fill toast */}
          {showPreventivoToast && typeof document !== 'undefined' && createPortal(
            <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-2xl shadow-black/60 flex items-center gap-3 ${preventivoToastHiding ? 'toast-exit' : 'toast-enter'}`}>
              <TiaIcon icon={CheckmarkCircle01Icon} size={20} className="text-teal-400" strokeWidth={2} />
              <span className="text-white text-sm font-medium">Form compilato automaticamente!</span>
            </div>,
            document.body
          )}

          {/* Chat reset confirmation toast */}
          {showResetToast && typeof document !== 'undefined' && createPortal(
            <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-2xl shadow-black/60 flex items-center gap-3 ${resetToastHiding ? 'toast-exit' : 'toast-enter'}`}>
              <TiaIcon icon={CheckmarkCircle01Icon} size={20} className="text-teal-400" strokeWidth={2} />
              <span className="text-white text-sm font-medium">{lang === 'it' ? 'Chat resettata' : lang === 'es' ? 'Chat reiniciada' : 'Chat reset'}</span>
            </div>,
            document.body
          )}

        </div>
        {/* ── Floating Chat Widget ── */}
        <div ref={chatWidgetRef} className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-auto">
          {/* Chat popup */}
          {chatOpen && (
            <BorderGlow
              continuousHover
              borderRadius={16}
              glowRadius={28}
              glowIntensity={1.4}
              edgeSensitivity={0}
              backgroundColor="#0f0f0f"
              className="[&_.border-glow-inner]:!overflow-visible"
            >
              <div role="dialog" aria-modal="true" aria-label="Chat con Tia Chinaglia" className={`absolute bottom-20 right-0 w-[calc(100vw-2rem)] max-w-[380px] max-h-[50vh] bg-[#0f0f0f] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col transition-all duration-300 ${chatOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}>
                {/* Title bar */}
                <div className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-[#1a1a1a]/60 backdrop-blur-xl select-none">
                  {/* Centered title */}
                  <span className="flex-1 text-center text-xs font-medium text-neutral-300 tracking-wide">{t('chat.title', lang)}</span>
                  {/* Close button */}
                  <button
                    onClick={() => setChatOpen(false)}
                    className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-colors text-neutral-500 hover:text-white shrink-0"
                    aria-label="Chiudi chat"
                  >
                    <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Messages area — data-lenis-prevent lets native scroll work inside
                   the chat without Lenis intercepting wheel events. When the container
                   has no overflow (empty chat or at boundary), the wheel naturally
                   passes through to the page. */}
                <div ref={chatMessagesRef} data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch onWheel={handleChatWheel} className="flex-1 px-5 py-4 min-h-0 overflow-y-auto flex flex-col gap-3">
                  {messages.length === 0 && !isTyping && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center select-none">
                        <p className="text-neutral-600/30 text-sm max-w-[200px] mx-auto leading-relaxed">{t('chat.empty_intro', lang)}</p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'tia' && (
                        <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                          <TiaIcon icon={BubbleChatIcon} size={12} className="text-teal-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${msg.sender === 'client'
                          ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white/[0.04] text-white rounded-2xl rounded-bl-sm'
                          }`}
                      >
                        {msg.text}
                      </div>
                      {msg.sender === 'client' && (
                        <div className="w-7 h-7 rounded-full bg-teal-600/30 flex items-center justify-center shrink-0">
                          <TiaIcon icon={UserIcon} size={14} className="text-teal-300" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex items-end gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                        <TiaIcon icon={BubbleChatIcon} size={12} className="text-teal-400" />
                      </div>
                      <div className="bg-white/[0.04] rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Input */}
                <div className="px-5 pb-5 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={chatTextareaRef}
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder={t('chat.placeholder', lang)}
                      rows={1}
                      autoFocus
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/30 resize-none placeholder-neutral-600"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!chatMessage.trim()}
                      className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 hover:bg-teal-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Invia messaggio"
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </BorderGlow>
          )}

          {/* Floating button with online dot */}
          <button
            onClick={() => {
              const next = !chatOpen;
              setChatOpen(next);
              if (next) logAnalytics('chat_open');
            }}
            className={`relative p-4 text-white rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${chatOpen ? 'bg-[#0f0f0f] scale-90' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-500/15'
              }`}
            aria-label={chatOpen ? 'Chiudi chat' : 'Apri chat'}
          >
            {chatOpen ? (
              <TiaIcon key="chat-close" icon={Cancel01Icon} size={24} strokeWidth={2} className="chat-icon-pop" />
            ) : (
              <TiaIcon key="chat-open" icon={BubbleChatIcon} size={24} className="chat-icon-pop" />
            )}
            {/* Online dot */}
            <span
              className={`absolute bottom-1 left-1 w-3.5 h-3.5 rounded-full border-2 border-[#010101] transition-all duration-500 ${chatOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'} ${isOnline ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)] animate-pulse' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.45)]'}`}
              aria-label={isOnline ? 'Disponibile' : 'Non disponibile'}
              title={isOnline ? 'Disponibile' : 'Non disponibile'}
            />
          </button>
        </div>

        {/* Floating Curved CTA — docks at the top with inverted curve when
             the chatbot enters the viewport, returns to the bottom otherwise. */}
        <div
          className="fixed left-0 right-0 z-[50] flex justify-start sm:justify-center pl-4 pr-[76px] sm:px-0 pointer-events-none transition-[top,bottom] duration-[350ms]"
          style={ctaDocked
            ? { bottom: 'calc(100vh - 88px)' }
            : { bottom: '24px' }
          }
        >
          <div
            style={{
              transform: ctaVisible
                ? `translateY(${ctaHiding ? '20px' : '0'})`
                : 'translateY(20px)',
              opacity: ctaVisible ? (ctaHiding ? 0 : 1) : 0,
              pointerEvents: ctaVisible ? 'auto' : 'none',
              transition: 'opacity 300ms ease-out, transform 300ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <CurvedInput
              label={t('nav.raccontami', lang)}
              showSparkle
              bend={ctaDocked ? -22 : 14}
              height={48}
              width={360}
              fontSize={14}
              backgroundColor="#ffffff06"
              textColor="#ffffff"
              borderColor="#ffffff12"
              arrowColor="#ffffff"
              arrowUp={ctaDocked}
              tooltip={showCtaTooltip ? t('bot.tooltip_raccontami', lang) : undefined}
              onClick={() => {
                logAnalytics('cta_floating_open_chatbot');
                navigator.vibrate?.(30);

                // Chatbot section is now always in the DOM (no LazySection).
                // Target its heading directly — position is stable from page load.
                const heading = document.getElementById('chatbot-heading');
                if (!heading || !lenis.current) return;

                const absoluteTop = heading.getBoundingClientRect().top + window.pageYOffset;
                const target = absoluteTop - 240;
                const max = document.documentElement.scrollHeight - window.innerHeight;

                const finalTarget = Math.min(Math.max(0, target), max);
                lenis.current.scrollTo(finalTarget, {
                  duration: 1.0,
                  lock: true,
                  force: true,
                  onComplete: () => {
                    // Absorb any height changes from LazySection mounts that
                    // happened during the scroll, then re-anchor to the exact
                    // target position — prevents the second "scatto" jump.
                    lenis.current?.resize();
                    lenis.current?.scrollTo(finalTarget, { immediate: true, lock: true, force: true });
                    window.setTimeout(() => botInputRef.current?.focus(), 300);
                  },
                });
              }}
            />
          </div>
        </div>

      </MobileGlowActivator>
    </SmoothScrollProvider>
  );
}
