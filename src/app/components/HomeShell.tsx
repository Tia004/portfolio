'use client';

/** @category React e Core */
import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import InfiniteSlider from './InfiniteSlider';
import { useLanguage } from './LanguageProvider';
import ProcessTimeline from './ProcessTimeline';
import { t, getFaqs, getReviews, getProjects, getPricingOnetime, getPricingMonthly, type ProjectData, type Review } from '@/lib/translations';
import { trackClick } from '@/lib/analytics';
import { type ChatCategory } from '@/lib/chat-categories';
import { moltenModulePromise } from './molten-preload';
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
// WebGL canvases are the heaviest client chunks (three.js for the dither,
// ogl for the molten). Loading them with next/dynamic keeps their eval off
// the critical path: the hero's static texture base and the molten's CSS
// gradient fallback both paint instantly, and the canvas swaps in after
// hydration without blocking the first paint.
const Dither = dynamic(() => import('./Dither'), { ssr: false, loading: () => null });
// The dynamic import starts at mount (first render — no lazy trigger), so the
// molten chunk downloads with the initial JS. The splash waits for the shader
// compile ('tia:molten-ready', bounded) before lifting, so the background is
// ready the moment the user first scrolls into the transparent sections.
// The chunk import starts at MODULE EVAL (not at React mount): by the time
// hydration and the splash finish, the shader is already compiled and the
// splash only exits once MoltenMetal has fired 'tia:molten-ready'. The same
// promise is handed to next/dynamic, so the component renders from the
// already-loaded module.
const MoltenMetal = dynamic(() => moltenModulePromise ?? import('./MoltenMetal'), { ssr: false, loading: () => null });
import Navbar from './Navbar';
import ScrollReveal from './ScrollReveal';
import StaggerReveal from './StaggerReveal';
import CurvedInput from './CurvedInput';
import MobileSnapSlider from './MobileSnapSlider';
const FooterAnimation = dynamic(() => import('./FooterAnimation'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-[rgba(6,10,10,0.4)]" aria-hidden="true" />,
});

// Below-fold / on-demand UI: only ever rendered after hydration inside a
// LazySection (scroll) or behind a state conditional (modal open), so they
// never participate in SSR. Keeping them in the critical chunk wasted ~80KB
// of source on the first-load bundle for UI the visitor cannot see yet.
const ChatbotPanel = dynamic(() => import('./ChatbotPanel'), { ssr: false });
const FaqScroller = dynamic(() => import('./FaqScroller'), { ssr: false });
const ProjectModal = dynamic(() => import('./ProjectModal'), { ssr: false });
const LegalModal = dynamic(() => import('./LegalModal'), { ssr: false });
import { getLegalDoc, type LegalDoc } from '@/lib/legal-content';
import BorderGlow from './BorderGlow';
import { CHAT_CATEGORY_OPTIONS } from '@/lib/chat-categories';
import DotGrid from './DotGrid';
import { DotGridCard, TiltCard } from './InteractiveCard';
import TooltipContent from './TooltipContent';
import UrlPreviewCard from './UrlPreviewCard';
import InlinePreventivoForm from './InlinePreventivoForm';
import MobileGlowActivator from './MobileGlowActivator';
import LazySection from './LazySection';
import TypewriterText from './TypewriterText';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { ensureChatSession, mountTurnstile, secureChatFetch } from '@/lib/chat-client';


/** @category Hooks */
import { useTooltip } from '@/lib/useTooltip';

/** @category Dati e Config */
import { getTooltip } from '@/lib/tooltips';
import { HERO, STAGGER_BY_SECTION, HERO_COUNTUP_DELAYS, SKILL_TITLE_OFFSET } from '@/lib/animation-theme';
import { scrollToElementAfterLayout } from '@/lib/scroll';
import { isValidContactEmail, isValidContactMessage, isValidContactName } from '@/lib/input-validation';
import { playChatOpenSound } from '@/lib/menu-sounds';

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

// CHAT_CATEGORY_OPTIONS lives in @/lib/chat-categories (shared with the
// dynamically imported ChatbotPanel; keeping it out of that module lets the
// whole panel leave the critical chunk).

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

// ── CountUp & HeroGlow (extracted to CountUp.tsx) ─────────────
import { CountUp, HeroGlow } from './CountUp';

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
        <div className={`p-5 sm:p-8 flex flex-col h-full rounded-[20px] relative ${premium ? 'bg-gradient-to-b from-teal-500/[0.06] to-transparent' : ''}`}>
          {popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full z-10">
              {t('prezzi.popular', lang)}
            </span>
          )}
          <h4 className={`font-semibold text-base sm:text-lg mb-1 flex items-center gap-2 ${premium ? 'text-teal-300' : 'text-white'}`}>
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
          <p className="text-neutral-500 text-[11px] sm:text-xs mb-3">{description}</p>
          <div className="flex items-center gap-2 mb-3">
            <TiaIcon icon={Clock01Icon} size={14} className="text-teal-400 shrink-0" strokeWidth={2} />
            <span className="text-teal-400/80 text-xs font-medium">{delivery}</span>
            {delivery.match(/giorni|days|días|24-48h|immediata|immediate|inmediata|1-2 settimane|1-2 weeks|1-2 semanas/i) && (
              <span
                {...rapidaHandlers}
                className="ml-2 px-1.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-[9px] font-semibold uppercase tracking-wider text-teal-400 leading-none cursor-help"
              >
                {t('prezzi.rapid', lang)}
              </span>
            )}
          </div>
          {hours && (
            <div className="flex items-center gap-2 mb-3">
              <svg aria-hidden="true" className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
              <span className="text-teal-400/80 text-xs font-medium">{hours}</span>
            </div>
          )}
          <div className="mb-4">
            {price ? (
              <span className={`text-2xl sm:text-4xl font-bold ${premium ? 'text-teal-300' : 'text-white'}`}>
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
          <ul className="space-y-2.5 flex-1 mb-4">
            {features.map((f, i) => {
              const tip = getTooltip(f, lang);
              return (
                <li key={i} className="flex items-start gap-2 text-neutral-400 text-[13px] sm:text-sm">
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
            className={`block w-full text-center py-2.5 sm:py-3 rounded-full text-sm font-medium transition-all ${premium
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
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
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
    .replace(/\[OFFTOPIC\]/gi, '')
    .replace(/(?:private|internal)\s+(?:quote|context|payload|metadata)[^.!?]*[.!?]?/gi, '')
    .replace(/(?:contesto|payload|metadata|protocollo)\s+(?:interno|privato)[^.!?]*[.!?]?/gi, '')
    .replace(/(?:dati|dettagli|informazioni)\s+(?:raccolti|raccolte|inseriti|inserite)\s+(?:per|del|del tuo)\s+preventivo[^.!?]*[.!?]?/gi, '')
    .replace(/Ho completato i dati per il preventivo[^.]*\.?/gi, '')
    .replace(/I have completed the quote details[^.]*\.?/gi, '')
    .replace(/He completado los datos del presupuesto[^.]*\.?/gi, '')
    // Defensive: strip residual UI meta-instructions the model sometimes emits
    // as visible text instead of the raw markers (it, en, es). Parenthetical
    // notes about "insert a link / a window will appear / pick one" are never
    // meant for the visitor — the UI renders chips/sliders/fields itself.
    .replace(/\(\s*(?:inserisci|clicca|apparir[àa]|seleziona|scegli|apri|vedi|nota|linker?|finestr[ae]|opzioni|bott[oe]n[ei]?|qui|sotto|accanto|compare|appare|trovi|cliccabili?)\b[^)]*\)/gi, '')
    .replace(/\(\s*(?:(?:an?|the)\s+)?(?:insert|click|clickable|choose|select|open|see|note|link|window|popup|options|buttons?|here|below|appears?|appear)\b[^)]*\)/gi, '')
    .replace(/\(\s*(?:inserta|haz clic|clic|elige|selecciona|abre|ver|nota|enlace|ventana|emergente|opciones|botones?|aquí|abajo|aparece|aparecer[áa]|clicables?)\b[^)]*\)/gi, '')
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
  const markerStart = text.search(/\[(?:PREVENTIVO|FORM_REQUIRED|SUGGESTIONS|OFFTOPIC)[:\]]/i);
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
            return <li key={li} className="text-neutral-200 text-sm sm:text-base">{renderInline(content)}</li>;
          })}
        </ul>
      );
    }
    // Regular paragraph
    return (
      <p key={pi} className="mb-2 last:mb-0 text-sm sm:text-base leading-relaxed">
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

// ── Linkify direct-chat text ──────────────────────────────────────────────
// Tia's contact info — used to turn phone numbers and the word "whatsapp"
// into real links (tel: / wa.me) inside chat bubbles.
const TIA_PHONE_DIGITS = '393318821334'; // +39 331 882 1334
const TIA_WHATSAPP_URL = `https://wa.me/${TIA_PHONE_DIGITS}`;

/**
 * Turn URLs, emails, Italian phone numbers and the word "whatsapp" into
 * clickable teal links. Used for the direct chat with Tia (not the AI bot,
 * which has its own markdown renderer). `isClientBubble` switches the link
 * color so it stays readable on the teal client bubble.
 */
function linkifyChatText(text: string, isClientBubble: boolean): React.ReactNode {
  if (!text) return null;
  const linkCls = isClientBubble
    ? 'text-teal-50 underline underline-offset-2 decoration-teal-100/70 hover:text-white break-all'
    : 'text-teal-300 underline underline-offset-2 decoration-teal-400/60 hover:text-teal-200 break-all';

  // Order matters: URL first (contains www), then email, then Italian phone
  // (10-digit mobile starting with 3, or +39-prefixed), then "whatsapp".
  const combined = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|((?:\+39[\s.-]?)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}))|\bwhatsapp\b/gi;

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text)) !== null) {
    const idx = m.index;
    if (idx > last) nodes.push(text.slice(last, idx));
    const [full, url, email, phone] = m;
    let href = '';
    let label = full;
    if (url) {
      // Strip trailing punctuation so "vai su www.tia.it." doesn't link the dot.
      const clean = full.replace(/[.,;:!?)]+$/, '');
      href = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
      label = clean;
    } else if (email) {
      href = `mailto:${email}`;
    } else if (phone) {
      const digits = phone.replace(/\D/g, '');
      const intl = digits.startsWith('39') && digits.length >= 11 ? digits : `${TIA_PHONE_DIGITS.slice(0, 2)}${digits}`;
      href = `tel:+${intl}`;
    } else {
      href = TIA_WHATSAPP_URL;
    }
    nodes.push(
      <a key={key++} href={href} target={/^https?:/.test(href) ? '_blank' : undefined} rel="noopener noreferrer" className={linkCls} onClick={(e) => e.stopPropagation()}>
        {label}
      </a>
    );
    last = idx + full.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? <>{nodes}</> : text;
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

  // Warm the below-fold dynamic chunks after first paint (well past LCP, so
  // it never competes with the splash/hero): by the time the visitor scrolls
  // to the chat or FAQ, or opens a project/legal modal, the chunk is cached
  // and the component mounts instantly — zero visible loading gap.
  useEffect(() => {
    const t = window.setTimeout(() => {
      void import('./ChatbotPanel');
      void import('./FaqScroller');
      void import('./ProjectModal');
      void import('./LegalModal');
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

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

    // Capture the instance once: the ref may be reassigned between renders,
    // but within this effect lifetime the instance is stable.
    const lenisInstance = lenis.current;

    // Debounced scroll-stop detector: resets on every 'scroll' event.
    // When scrolling finally stops for 300ms, allow one resize to catch up.
    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollStoppedTimer) clearTimeout(scrollStoppedTimer);
      scrollStoppedTimer = setTimeout(() => {
        scrollStoppedTimer = undefined;
        isScrollingRef.current = false;
        lenisInstance?.resize();
      }, 300);
    };

    lenisInstance?.on('scroll', onScroll);

    const ro = new ResizeObserver(() => {
      if (isScrollingRef.current) return; // never resize mid-scroll
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        lenisInstance?.resize();
      }, 400);
    });
    ro.observe(document.body);

    // LazySection mounts change the document height (placeholder → real
    // content). lenis.resize() is safe at any moment — it only recalculates
    // scrollHeight/limit and never writes the scroll position — so update the
    // limit IMMEDIATELY on mount instead of waiting for the scroll-stop
    // debounce. Otherwise a fast continuous scroll past a just-mounted section
    // clamps Lenis' target to the stale smaller limit: the scroll visibly
    // "stops" and then restarts once the debounce finally runs.
    let mountRaf = 0;
    const onSectionMounted = () => {
      cancelAnimationFrame(mountRaf);
      mountRaf = requestAnimationFrame(() => lenisInstance?.resize());
    };
    window.addEventListener('tia:section-mounted', onSectionMounted);

    return () => {
      lenisInstance?.off('scroll', onScroll);
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      if (scrollStoppedTimer) clearTimeout(scrollStoppedTimer);
      cancelAnimationFrame(mountRaf);
      window.removeEventListener('tia:section-mounted', onSectionMounted);
    };
  }, [lenis]);
  const [isMonthly, setIsMonthly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('Tutti');
  const [projectsPage, setProjectsPage] = useState(0);
  const [tooltipInfo, setTooltipInfo] = useState<{ text: string; el: HTMLElement; hiding?: boolean } | null>(null);
  const hideTooltipTimerRef = useRef<number | null>(null);
  const ctaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClosing, setChatClosing] = useState(false);
  // Keyboard offset (mobile): when the on-screen keyboard opens, visualViewport
  // shrinks while the layout viewport doesn't — Chrome would otherwise scroll
  // the WHOLE page up to reveal the chat input (the ugly jump). Lifting the
  // widget by the keyboard height keeps the chat (and its input) pinned just
  // above the keyboard instead.
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    if (!chatOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height));
      setKbOffset(prev => (prev === kb ? prev : kb));
    };
    onResize();
    vv.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [chatOpen]);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [ctaHiding, setCtaHiding] = useState(false);
  const [ctaDocked, setCtaDocked] = useState(false); // true = docked at top with inverted curve
  const ctaDockedRef = useRef(false);
  const ctaHidingRef = useRef(false);
  const ctaVisibleRef = useRef(true);
  // Keep the refs in sync so callbacks (scroll, timer) always read the latest
  // value. ctaVisibleRef is CRITICAL: the position-sync effect below must NOT
  // re-run when ctaVisible flips, or the 5s inactivity hide would be instantly
  // reverted by the effect's own sync call — an endless show/hide "bounce"
  // every few seconds on desktop (mobile is immune: the timer is disabled).
  useEffect(() => { ctaDockedRef.current = ctaDocked; }, [ctaDocked]);
  useEffect(() => { ctaVisibleRef.current = ctaVisible; }, [ctaVisible]);

  // ── Mobile detection — when docked at the top the CTA shrinks into a
  // small pill that sits in the navbar row (between the logo and the burger)
  // instead of a full-size bar floating at the very top of the viewport. ──
  // useSyncExternalStore keeps the matchMedia subscription outside the render
  // path (no setState-in-effect, no missing-deps) while staying hydration-safe:
  // the server snapshot is false, matching the initial SSR HTML.
  const subscribeIsMobile = useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia('(max-width: 767px)');
    mq.addEventListener('change', onStoreChange);
    return () => mq.removeEventListener('change', onStoreChange);
  }, []);
  const getIsMobileSnapshot = useCallback(() => window.matchMedia('(max-width: 767px)').matches, []);
  const isMobile = useSyncExternalStore(subscribeIsMobile, getIsMobileSnapshot, () => false);

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

  // Hide BOTH ProgressiveBlur bars while the chatbot section fills the whole
  // screen ("esattamente nel chatbot"): the bottom bar would otherwise frost
  // the input bar + specialization bubbles, the top bar the heading. They come
  // back as soon as you scroll above or past the section. IntersectionObserver
  // is used (not scroll math) because it fires reliably regardless of how the
  // scroll happens (Lenis animation, wheel, CTA landing, touch).
  const [chatFullscreen, setChatFullscreen] = useState(false);
  useEffect(() => {
    const chatbot = document.getElementById('chatbot');
    if (!chatbot) return;
    const io = new IntersectionObserver(([entry]) => {
      setChatFullscreen(entry.isIntersecting && entry.intersectionRatio > 0.85);
    }, { threshold: [0.85] });
    io.observe(chatbot);
    return () => io.disconnect();
  }, []);

  // Hide bottom ProgressiveBlur when scrolled to the very bottom — the blur
  // otherwise covers the footer and modals, making them unreadable.
  // Must use Lenis scroll position (not window.scrollY) because Lenis
  // disables native scrolling and manages its own virtual scroll.
  const [blurBottomHidden, setBlurBottomHidden] = useState(false);
  useEffect(() => {
    const lenisInstance = lenis.current;
    if (!lenisInstance) return;
    const check = () => {
      setBlurBottomHidden(lenisInstance.scroll >= lenisInstance.limit - 20);
    };
    check();
    lenisInstance.on('scroll', check);
    return () => { lenisInstance.off('scroll', check); };
  }, [lenis]);

  // ── Hide CTA with fade-out + slide-down animation ──
  const hideCta = useCallback(() => {
    if (ctaHidingRef.current) return; // Already hiding, don't restart timer
    ctaHidingRef.current = true;
    if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
    setCtaHiding(true);
    // eslint-disable-next-line react-hooks/immutability -- timer ref written in a callback and read in effect cleanup is the standard pattern; the rule can't track ref lifetimes across hook boundaries.
    ctaTimerRef.current = setTimeout(() => {
      setCtaVisible(false);
      setCtaHiding(false);
      ctaHidingRef.current = false;
    }, 200);
  }, []);

  // ── Reset the 5s inactivity timer — never hides docked CTA ──
  // Below 768px (phones, and narrow windows tested in the preview) the CTA
  // stays always visible: there is no hover to rediscover it and the 5s
  // auto-hide made it feel broken. The inactivity hide is desktop-only.
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
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

  const [messages, setMessages] = useState<{ id: number; text: string; sender: 'client' | 'tia' | 'system' }[]>([]);
  const [isTyping] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const nextIdRef = useRef(1);
  const welcomeSentRef = useRef(false);
  // This ID is issued by the server and is paired with the HttpOnly chat cookie.
  // Never generate a client-controlled session ID for chat requests.
  const sessionIdRef = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const lastPollRef = useRef(0);

  // Turnstile is mounted LAZILY: the script (~130KB + widget work) loads only
  // when the chatbot section enters the viewport, i.e. the visitor is about to
  // use the chat. Protected requests still wait on turnstileWidgetReady (the
  // mount promise is published before the first await), so the first message
  // is never blocked by the lazy mount.
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !turnstileContainerRef.current) return;
    const container = turnstileContainerRef.current;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const mount = () => {
      if (cancelled || cleanup) return;
      mountTurnstile(container, siteKey)
        .then((fn) => { if (!cancelled) cleanup = fn; })
        .catch(() => () => undefined);
    };

    const chatSection = document.getElementById('chatbot');
    if (!chatSection) {
      mount(); // section not rendered — fall back to eager mount
    } else {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            mount();
            io.disconnect();
          }
        },
        { rootMargin: '150px 0px 0px 0px' }
      );
      io.observe(chatSection);
    }

    return () => {
      cancelled = true;
      cleanup?.();
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
    isFormStale = false,
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
            disabled={isFormStale}
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
              quoteDraftRef.current = { ...quoteDraftRef.current, ...collected };
              // Send a REAL user message with the collected values (friendly,
              // localized) instead of a hidden instruction: the model sees the
              // actual name/email/budget in the transcript, so it never re-asks
              // for fields that are already filled — that was the source of the
              // infinite name/email loop. The values also travel privately in
              // `quoteDraft` for the recap guard and the email chips.
              const bits: string[] = [];
              if (sliderData && typeof sliderData.budget === 'number' && Number.isFinite(sliderData.budget)) {
                bits.push(t('bot.budget_submitted', lang).replace(/\{value\}/g, () => String(Math.round(sliderData.budget))));
              }
              if (filtered.name && filtered.email) {
                bits.push(
                  t('bot.identity_submitted', lang)
                    .replace(/\{name\}/g, () => filtered.name)
                    .replace(/\{email\}/g, () => filtered.email)
                );
              } else {
                if (filtered.name) bits.push(t('bot.name_submitted', lang).replace(/\{name\}/g, () => filtered.name));
                if (filtered.email) bits.push(t('bot.email_submitted', lang).replace(/\{email\}/g, () => filtered.email));
              }
              const submittedMsg = bits.join(' ') || t('bot.details_saved', lang);
              sendBotMessage(submittedMsg, { quoteDraft: quoteDraftRef.current, displayUserMessage: true });
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
            <p className="mb-3 text-xs sm:text-sm leading-relaxed text-teal-200/80">{t('bot.quote_review', lang)}</p>
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
                  onClick={() => reviseQuote(messageId)}
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
  const [chatCategory, setChatCategory] = useState<ChatCategory>('general');
  // chatStarted dims the teal halo once the visitor passes the welcome
  // (tapping a welcome bubble or typing a message). The old specialization
  // bar is gone — specializations live in the welcome bubbles now.
  const [chatStarted, setChatStarted] = useState(false);
  // ── Off-topic guard: after 3 off-topic messages the chat input is blocked
  // for 30 minutes. Persisted in sessionStorage so a reload can't bypass it. ──
  const OFFTOPIC_BLOCK_MS = 30 * 60 * 1000;
  const [chatBlockedUntil, setChatBlockedUntil] = useState(0);
  const [, setOfftopicStrikes] = useState(0);
  const offtopicStrikesRef = useRef(0);
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
    /** Messages carrying an input (slider/form/recap) never render chips. */
    noChips?: boolean;
  }[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const [approvalSendingId, setApprovalSendingId] = useState<number | null>(null);
  const approvalSendingRef = useRef<number | null>(null);
  const botNextIdRef = useRef(1);
  const botMessagesRef = useRef<HTMLDivElement>(null);
  const botInputRef = useRef<HTMLTextAreaElement>(null);
  // Track the id of the most recent message of ANY kind: chips deactivate as
  // soon as ANY newer message exists (user text, a chip pick, or a bot reply).
  const latestMessageIdRef = useRef(0);

  // ── Chat persistence: save/restore via sessionStorage with 30-min TTL ──
  const CHAT_STORAGE_KEY = 'tia_bot_chat';
  const CHAT_TTL_MS = 30 * 60 * 1000; // 30 minutes

  // Restore the off-topic block / strikes from sessionStorage on mount.
  useEffect(() => {
    try {
      const untilRaw = sessionStorage.getItem('tia_bot_blocked_until');
      const until = untilRaw ? Number(untilRaw) : 0;
      const strikesRaw = sessionStorage.getItem('tia_bot_offtopic_strikes');
      const strikes = strikesRaw ? Number(strikesRaw) : 0;
      if (until > Date.now()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sessionStorage restore on mount (TTL-guarded); nothing to subscribe to, so useSyncExternalStore doesn't apply.
        setChatBlockedUntil(until);
        setOfftopicStrikes(strikes);
        offtopicStrikesRef.current = strikes;
      } else if (untilRaw || strikesRaw) {
        // Expired or stale — reset both.
        sessionStorage.removeItem('tia_bot_blocked_until');
        sessionStorage.removeItem('tia_bot_offtopic_strikes');
      }
    } catch { /* storage unavailable, ignore */ }
  }, []);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sessionStorage restore on mount (chatRestoredRef-guarded); no subscription exists, useSyncExternalStore doesn't apply.
      setBotMessages(data.messages.slice(-20));
      setChatStarted(true);
      if (data.category && CHAT_CATEGORY_OPTIONS.some(o => o.value === data.category)) {
        setChatCategory(data.category);
      }
      // Shift the next ID past restored messages so new messages don't collide
      const maxId = data.messages.reduce((max: number, m: { id: number }) => Math.max(max, m.id ?? 0), 0);
      botNextIdRef.current = maxId + 1;
    } catch { /* malformed storage, ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearChatBlock = useCallback(() => {
    setChatBlockedUntil(0);
    setOfftopicStrikes(0);
    offtopicStrikesRef.current = 0;
    try {
      sessionStorage.removeItem('tia_bot_blocked_until');
      sessionStorage.removeItem('tia_bot_offtopic_strikes');
    } catch { /* ignore */ }
  }, []);

  // Unblock automatically once the 30-minute pause expires.
  useEffect(() => {
    if (chatBlockedUntil <= Date.now()) return;
    const id = setTimeout(clearChatBlock, chatBlockedUntil - Date.now() + 1000);
    return () => clearTimeout(id);
  }, [chatBlockedUntil, clearChatBlock]);

  // eslint-disable-next-line react-hooks/purity -- expiry check must re-evaluate on every render; Date.now() is the only correct source for "is the 30-min block still active".
  const chatBlocked = chatBlockedUntil > Date.now();

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
    setChatStarted(false);
    setBotInput('');
    quoteDraftRef.current = {};
    quoteEmailSentRef.current = null;
    botNextIdRef.current = 1;
    latestMessageIdRef.current = 0;
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

  // Choose a specialization from the always-visible bar. In the empty state it
  // is the FIRST interaction: it starts the chat in that specialization so the
  // AI immediately asks the drill-down questions. Mid-chat it starts a fresh
  // conversation in the new specialization (old one is wiped). Clicking the
  // active category again is a no-op.
  const selectChatCategory = (value: ChatCategory) => {
    if (value === chatCategory) return;
    if (chatBlocked) return;
    setChatCategory(value);
    setChatStarted(true);
    if (botMessages.length === 0) {
      // The specialization itself is not posted as a user bubble: the bot
      // picks it up directly and immediately replies with the first question
      // for that specialization (see welcome bubbles in ChatbotPanel).
      sendBotMessage(
        t(CHAT_CATEGORY_OPTIONS.find(option => option.value === value)?.labelKey ?? 'chat.category_software_web', lang),
        { category: value, displayUserMessage: false },
      );
    } else {
      resetChat();
    }
  };

  // Chat wheel/touch over the message areas: data-lenis-prevent lets the
  // BROWSER scroll them natively, and overscroll-contain (on the containers)
  // swallows boundary wheel/touch so it NEVER chains into the page. A native
  // overscroll that reaches the page would scroll window.scrollY instantly
  // while Lenis still animates toward its own (stale) position — that fight
  // is the up/down micro-jitter when scrolling past the chat.
  const sendBotMessage = (inputOverride?: string, options?: { quoteDraft?: Record<string, string>; displayUserMessage?: boolean; category?: ChatCategory }) => {
    const text = (inputOverride ?? botInput).trim();
    if (!text) return;
    // Off-topic block: after 3 strikes the visitor cannot send anything for 30 min.
    // eslint-disable-next-line react-hooks/purity -- live expiry check at send time (a closure value would be stale between renders); inherently time-dependent.
    if (chatBlockedUntil > Date.now()) return;
    // Any real message (text or a chip) counts as "passing the welcome": the
    // teal halo dims from here on (specializations stay in the welcome
    // bubbles until a new chat is started).
    setChatStarted(true);
    // Allow the request to carry an explicit category even though the state
    // update above hasn't flushed yet (welcome-bubble clicks pass their own).
    const activeCategory = options?.category ?? chatCategory;
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
        category: activeCategory,
        quoteDraft: options?.quoteDraft ?? quoteDraftRef.current,
      }),
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => '');
        // Try to extract error from SSE body, fallback to generic message
        const errMsg = t('bot.error_server', lang);
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
      // Off-topic guard: the AI marks off-topic replies with [OFFTOPIC]. Count
      // the strikes and block the input for 30 minutes after the third one.
      const offtopicMatch = full.match(/\[OFFTOPIC\]/i);
      let blockTriggered = false;
      if (offtopicMatch) {
        offtopicStrikesRef.current += 1;
        const strikes = offtopicStrikesRef.current;
        setOfftopicStrikes(strikes);
        try { sessionStorage.setItem('tia_bot_offtopic_strikes', String(strikes)); } catch { /* ignore */ }
        if (strikes >= 3) {
          const until = Date.now() + OFFTOPIC_BLOCK_MS;
          setChatBlockedUntil(until);
          blockTriggered = true;
          try { sessionStorage.setItem('tia_bot_blocked_until', String(until)); } catch { /* ignore */ }
        }
      }
      // ── Interaction normalization ──
      // Each step (suggestions, budget slider, name/email form, recap) must
      // live in its OWN dedicated message, in flow order. The AI sometimes
      // merges several steps into one response (budget slider + style bubbles,
      // or recap + leftover drill-down chips): a slider buried next to a
      // question is never used, and chips next to the form only confuse the
      // visitor. Split them here so every interaction stays usable.
      const suggMarkersInFull = full.match(/\[SUGGESTIONS:[^\]]*\]/gi) ?? [];
      const sliderMarkersInFull = full.match(/\[SLIDER:[^\]]*\]/gi) ?? [];
      const hasSugg = suggMarkersInFull.length > 0;
      const hasSlider = sliderMarkersInFull.length > 0;
      const hasForm = Boolean(formRequiredMatch);
      const hasRecap = Boolean(preventivoMatch);
      // The budget slider never shares a bubble with anything else: when it is
      // merged with bubbles, the form or the recap, it gets its own message.
      const splitSliderMsg = hasSlider && (hasSugg || hasForm || hasRecap);
      // Chips merged into a slider/form/recap message are stale or
      // wrong-category: drop them so they NEVER appear next to the budget
      // slider or the name/email fields (a stray bubble under those inputs
      // makes the fields get re-proposed — the loop the user hit).
      const dropSugg = hasSugg && (hasSlider || hasForm || hasRecap);
      // Messages that carry an input (slider, form, recap) must never render
      // suggestion chips at all — not even detected plain-text ones.
      const noChipsOnMessage = hasSlider || hasForm || hasRecap;
      let displayText = full;
      let parsedPrefill: Record<string, string> | undefined;
      let requiresApproval = false;
      if (dropSugg) {
        displayText = displayText.replace(/\[SUGGESTIONS:[^\]]*\]/gi, '').trim();
      }
      if (splitSliderMsg) {
        // The slider is re-emitted as its own dedicated message below.
        displayText = displayText.replace(/\[SLIDER:[^\]]*\]/gi, '').trim();
      }
      if (formRequiredMatch) {
        // Keep the private marker in state so renderBotMessage can mount the
        // friendly inline fields; it is stripped before rendering.
        displayText = displayText;
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
            const visibleText = sanitizeBotText(displayText || '');
            // The internal 'message' field is the third-person summary for Tia
            // (with sector, need and — after a revision — the requested changes).
            // It is what gets emailed/prefilled, so it takes priority over the
            // visible text; the visible summary is only a fallback if the AI
            // omitted the field.
            const internalMsg = sanitizeBotText(completePrefill.message || '');
            const finalQuote = internalMsg || visibleText;
            if (!isDetailedQuote(finalQuote)) {
              // Do not email or navigate on a premature/empty marker. Keep the
              // visitor in the conversation and ask the AI to finish properly.
              // Never expose raw internal text (third-person message for Tia)
              // to the client — show only the friendly error.
              displayText = t('bot.quote_not_ready', lang);
            } else {
              // Keep the generated quote in the conversation as a draft. Nothing
              // is sent and the page does not navigate until the visitor explicitly
              // approves it with the action below.
              const quotePrefill = { ...completePrefill, message: finalQuote };
              quoteDraftRef.current = quotePrefill;
              parsedPrefill = quotePrefill;
              requiresApproval = true;
              // The chat shows the client-facing summary; the internal message
              // stays private in the draft and is what Tia receives on approval.
              displayText = visibleText;
            }
          }
        } catch { /* invalid JSON, ignore */ }
      }
      // Dedicated budget/slider message, inserted so the flow order is
      // preserved: BEFORE the form/recap (budget first), but AFTER a merged
      // suggestions question (requirements first, then budget). The ids are
      // reserved outside the updater to avoid side effects inside it.
      const sliderMsgId = splitSliderMsg ? botNextIdRef.current++ : 0;
      const blockMsgId = blockTriggered ? botNextIdRef.current++ : 0;
      // The [OFFTOPIC] marker is private — strip it from what the visitor sees.
      const finalDisplayText = displayText.replace(/\[OFFTOPIC\]/gi, '').trim();
      setBotMessages(prev => {
        const updated: typeof botMessages = prev.map(m => m.id === replyId ? {
          ...m,
          text: finalDisplayText,
          prefill: parsedPrefill,
          requiresApproval,
          approvalState: requiresApproval ? 'pending' : undefined,
          noChips: noChipsOnMessage,
        } : m);
        if (splitSliderMsg) {
          const sliderMsg: typeof botMessages[number] = {
            id: sliderMsgId,
            text: `${t('bot.budget_ask', lang)}\n\n${sliderMarkersInFull.join('\n')}`,
            sender: 'bot',
            noChips: true,
          };
          const idx = updated.findIndex(m => m.id === replyId);
          // After a merged question (bubbles + slider) the slider goes AFTER
          // the question; next to the form/recap it goes BEFORE it.
          const insertAt = hasSugg && !hasForm && !hasRecap ? idx + 1 : idx;
          updated.splice(insertAt < 0 ? updated.length : insertAt, 0, sliderMsg);
        }
        if (blockTriggered) {
          // Inform the visitor that the chat is paused for 30 minutes.
          updated.push({
            id: blockMsgId,
            text: t('bot.offtopic_block', lang),
            sender: 'bot',
          });
        }
        return updated;
      });
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
    // Send the internal third-person message for Tia (which the AI updates on
    // revision with the requested changes), falling back to the visible text.
    const finalQuote = sanitizeBotText(prefill.message || quote).trim();

    // Structured details for the email "chips": service, sub-category, budget
    // (the REAL slider value is authoritative), pages and delivery. The AI's
    // PREVENTIVO JSON may carry type/budget/pages/delivery; the slider value
    // from quoteDraftRef._sliders wins for budget because it is the actual
    // number the visitor picked on the slider.
    const sliderValues = (() => {
      try {
        const raw = quoteDraftRef.current._sliders ?? prefill._sliders;
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch { return {}; }
    })();
    const budgetFromSlider = typeof sliderValues.budget === 'number' && Number.isFinite(sliderValues.budget)
      ? sliderValues.budget
      : undefined;
    const details: Record<string, string | number> = {};
    if (service) details.service = service;
    if (prefill.type) details.type = prefill.type;
    if (budgetFromSlider !== undefined) details.budget = budgetFromSlider;
    else if (prefill.budget) {
      const n = Number(prefill.budget);
      details.budget = Number.isFinite(n) ? n : prefill.budget;
    }
    if (prefill.pages) details.pages = prefill.pages;
    if (prefill.delivery) details.delivery = prefill.delivery;

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
        body: JSON.stringify({ name, email, service, message: finalQuote, source: 'ai-quote', details }),
      });
      if (!response.ok) throw new Error('quote-send-failed');

      quoteEmailSentRef.current = quoteKey;
      sessionStorage.setItem(storageKey, '1');
      // eslint-disable-next-line react-hooks/immutability -- draft ref written after the async send and read by later renders; its lifetime spans hook boundaries, which the rule can't model.
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

  const reviseQuote = (messageId: number) => {
    setBotMessages(prev => prev.map(message => message.id === messageId ? { ...message, approvalState: 'revising' } : message));
    // Local, instant bot reply — no fake user bubble, no AI round-trip. The
    // AI picks up the revision when the visitor writes the actual change
    // (quoteDraftRef still holds the collected details for that call).
    setBotMessages(prev => [...prev, {
      id: botNextIdRef.current++,
      text: t('bot.revision_waiting', lang),
      sender: 'bot' as const,
    }]);
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
        setChatClosing(true);
        setTimeout(() => { setChatOpen(false); setChatClosing(false); setKbOffset(0); }, 300);
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
          const incoming = JSON.parse(e.data) as Array<{ id: number; text: string }>;
          if (!Array.isArray(incoming) || incoming.length === 0) return;
          lastPollRef.current = Date.now();
          setMessages(prev => {
            // Dedup on (id|text): the id alone is not a reliable key when the
            // read source switches between stores after an outage (ids may
            // briefly differ on the same message). Text + id is unique enough.
            const existingKeys = new Set(prev.map(m => `${m.id}|${m.text}`));
            const newMsgs = incoming.filter((m) => !existingKeys.has(`${m.id}|${m.text}`));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs.map((m) => ({ id: m.id, text: m.text, sender: 'tia' as const }))];
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

    // The chatbot's position in DOCUMENT coordinates (top/bottom from the
    // document start). Cached once the layout settles — document coords don't
    // move with scroll, so comparing the LIVE window.scrollY against this
    // stable band is immune to the transient rect measurements at load
    // (scroll restoration, lazy-section mounts, fonts) that used to leave the
    // CTA wrongly docked at the top while the user was still in the hero.
    const band = { top: -1, bottom: -1 };
    const measureBand = () => {
      const chatbot = document.getElementById('chatbot');
      if (!chatbot) return false;
      const r = chatbot.getBoundingClientRect();
      if (r.height <= 0) return false;
      band.top = r.top + window.scrollY;
      band.bottom = r.bottom + window.scrollY;
      return true;
    };

    // Three-zone CTA behaviour:
    // 1. Above the chatbot   → bottom, normal curve (ctaDocked=false)
    // 2. Inside the chatbot  → hidden (ctaVisible=false)
    // 3. After the chatbot   → top, inverted curve (ctaDocked=true)
    const syncCtaWithChatbotPosition = () => {
      if (band.top < 0 && !measureBand()) return;
      const sy = window.scrollY;
      const vh = window.innerHeight;
      const aboveChatbot = band.top > sy + vh; // chatbot below the viewport
      const pastChatbot = sy > band.bottom;    // chatbot fully above the viewport

      if (aboveChatbot) {
        // Zone 1 — normal bottom position.
        if (ctaDockedRef.current) setCtaDocked(false);
        if (ctaHidingRef.current) {
          if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
          ctaHidingRef.current = false;
          setCtaHiding(false);
        }
        if (!ctaVisibleRef.current) setCtaVisible(true);
        if (sy >= 300) resetInactivityTimer();
        return;
      }

      if (pastChatbot) {
        // Zone 3 — dock at top with inverted curve.
        if (ctaHidingRef.current) {
          if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
          ctaHidingRef.current = false;
          setCtaHiding(false);
        }
        if (!ctaVisibleRef.current) setCtaVisible(true);
        if (!ctaDockedRef.current) setCtaDocked(true);
        return;
      }

      // Zone 2 — inside the chatbot section: hide the CTA.
      if (!ctaHidingRef.current && ctaVisibleRef.current) hideCta();
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        lastScrollYRef.current = window.scrollY;
        syncCtaWithChatbotPosition();
      });
    };

    // Defer the FIRST sync until the layout settles (fonts + a settle beat)
    // so we never measure the band mid-hydration; re-measure whenever a lazy
    // section above the chatbot mounts (its document position moves) and
    // re-sync when the splash finishes (the page may have settled at a
    // browser-restored deep scroll position).
    const settle = () => {
      measureBand();
      syncCtaWithChatbotPosition();
    };
    const settleTimer = window.setTimeout(settle, 600);
    window.addEventListener('load', settle);
    document.fonts?.ready.then(settle).catch(() => {});
    const onMounted = () => {
      measureBand();
      syncCtaWithChatbotPosition();
    };
    window.addEventListener('tia:section-mounted', onMounted);
    window.addEventListener('splash-complete', onMounted);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('tia:section-mounted', onMounted);
      window.removeEventListener('splash-complete', onMounted);
      window.removeEventListener('load', settle);
      window.clearTimeout(settleTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // Deliberately NOT dependent on ctaVisible: re-running this effect when
    // the CTA hides would immediately re-show it (syncCta reads the ref) and
    // re-arm the inactivity timer — the 5s show/hide bounce. hideCta and
    // resetInactivityTimer are stable useCallbacks, so this runs once.
  }, [hideCta, resetInactivityTimer]);

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

  // Global haptic feedback: every button/link tap gets a short vibration on
  // devices that support it (navigator.vibrate exists only on mobile —
  // Android Chrome etc.), so CTAs, slider arrows, chips, and nav items all
  // give a tactile response. Capture-phase pointerdown for the fastest feel;
  // debounced so a pointerdown + click pair never double-fires.
  useEffect(() => {
    let last = 0;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('button, a[href], [role="button"], [role="menuitem"], [role="link"]')) return;
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      navigator.vibrate?.(10);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

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
      // The optimistic bubble above already shows the message, but the server
      // rejected it (rate limit, session expiry, outage). Never stay silent:
      // a neutral system notice makes the failure visible instead of looking
      // like the message went through while Telegram never receives it.
      const failId = nextIdRef.current++;
      setMessages(prev => [...prev, { id: failId, text: t('chat.send_error', lang), sender: 'system' }]);
    }
  };

  const pricing = useMemo(() => isMonthly ? getPricingMonthly(lang) : getPricingOnetime(lang), [isMonthly, lang]);
  const reviews = useMemo(() => getReviews(lang), [lang]);
  const projectById = useMemo(() => {
    const map = new Map<string, ProjectData>();
    for (const project of getProjects(lang)) map.set(project.id, project);
    return map;
  }, [lang]);

  // Review card — clickable toward its related project when one exists.
  const renderReviewCard = (review: Review, key: string) => {
    const project = review.projectId ? projectById.get(review.projectId) : undefined;
    return (
      <BorderGlow key={key} continuousHover borderRadius={20} glowRadius={25} glowIntensity={2.0} edgeSensitivity={0} className="w-full">
        <div
          className={`p-5 sm:p-6 ${project ? 'cursor-pointer' : ''}`}
          onClick={() => { if (project) setSelectedProject(project); }}
          role={project ? 'button' : undefined}
          tabIndex={project ? 0 : undefined}
          onKeyDown={(event) => { if (project && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedProject(project); } }}
        >
          <div className="flex gap-1 mb-3">
            {Array.from({ length: review.stars }).map((_, i) => (
              <svg key={i} aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            ))}
          </div>
          <p className="text-neutral-300 text-sm leading-relaxed mb-3 italic">&ldquo;{review.text}&rdquo;</p>
          <p className="text-white font-medium text-sm">{review.name}</p>
          <p className="text-neutral-500 text-xs">{review.role}</p>
          {project && (
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-400 transition-colors">
              {t('recensioni.view_project', lang)}
              <TiaIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
            </span>
          )}
        </div>
      </BorderGlow>
    );
  };
  const filteredProjects = useMemo(
    () => getProjects(lang).filter((project) => activeFilter === 'Tutti' || project.category === activeFilter),
    [activeFilter, lang]
  );
  // Desktop shows 3 projects per view (one row) with arrows — 6 (two rows)
  // didn't fit a 16" screen and lost coherence. Mobile keeps its own slider.
  const projectPageSize = 3;
  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const projectPage = Math.min(projectsPage, projectTotalPages - 1);
  const pagedProjects = filteredProjects.slice(projectPage * projectPageSize, (projectPage + 1) * projectPageSize);
  const projectNavigationLabel = lang === 'it' ? 'Navigazione progetti' : lang === 'es' ? 'Navegación de proyectos' : 'Project navigation';
  const previousProjectsLabel = lang === 'it' ? 'Progetti precedenti' : lang === 'es' ? 'Proyectos anteriores' : 'Previous projects';
  const nextProjectsLabel = lang === 'it' ? 'Progetti successivi' : lang === 'es' ? 'Proyectos siguientes' : 'Next projects';
  const heroRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const heroEntranceStartedRef = useRef(false);
  const heroEntranceAnimRef = useRef<Animation[] | null>(null);

  // .hero-anim is painted at opacity:1 from the first paint (it's the LCP
  // element; the opaque splash covers it until it fades). The offset + blur
  // initial state is applied INLINE in the JSX (see the hero section), so it
  // is present from the SSR first paint with ZERO JS — no useLayoutEffect, no
  // gsap import on the critical path. LCP fires at first paint instead of
  // after the splash + entrance animation.

  // Reveal the hero exactly once, immediately after the splash completes.
  // Uses the native Web Animations API (NOT GSAP): the entrance must not wait
  // for a lazily-loaded ~122KB animation chunk to download, or LCP explodes on
  // throttled connections (the h1 stays blurred until GSAP arrives). WAAPI is
  // built into the browser — zero download. The blur is NOT animated: animating
  // `filter: blur()` is the most expensive paint in the entrance (every frame
  // re-blurs the text). It exists only as a STATIC inline state (set in the
  // JSX from SSR first paint, hidden behind the splash) and is cleared in ONE
  // frame at entrance start — the splash is fading right now, so the snap is
  // invisible — then only transform (y/scale) animates.
  useEffect(() => {
    if (!splashDone || heroEntranceStartedRef.current) return;
    const elements = Array.from(heroRef.current?.querySelectorAll<HTMLElement>('.hero-anim') ?? []);
    if (!elements.length) return;

    heroEntranceStartedRef.current = true;
    // Static blur → gone in a single frame; no blur painting during the tween.
    elements.forEach((el) => { el.style.filter = 'none'; });
    // Replicate HERO ease (power4.out ≈ cubic-bezier(0.16,1,0.3,1)) with a
    // stagger equal to HERO.stagger and the same duration, per element.
    heroEntranceAnimRef.current = elements.map((el, i) =>
      el.animate(
        [
          { transform: `translateY(${HERO.yOffset}px) scale(${HERO.scale})` },
          { transform: 'translateY(0px) scale(1)' },
        ],
        {
          duration: HERO.duration * 1000,
          delay: HERO.delay * 1000 + i * HERO.stagger * 1000,
          easing: 'cubic-bezier(0.16,1,0.3,1)',
          fill: 'forwards',
        }
      )
    );
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

  // ── Project card renderer — shared by the mobile snap slider (all
  //    filtered projects in a row) and the desktop paginated grid. ──
  const renderProjectCard = (project: ProjectData) => (
    <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="group h-full">
      <div className="bg-white/[0.03] rounded-[20px] h-full flex flex-col overflow-hidden">
        <div className="relative aspect-video w-full bg-white/[0.02] p-2.5 sm:p-3">
          <div className="w-full h-full overflow-hidden rounded-xl">
            <picture>
              {project.thumbnail.startsWith('/uploads/') && (
                <>
                  {/* Prefer the uniform 16:9 crop; fall back to the full uncropped variant. */}
                  <source srcSet={project.thumbnail.replace(/\.(png|jpe?g)$/i, '-thumb.avif')} type="image/avif" />
                  <source srcSet={project.thumbnail.replace(/\.(png|jpe?g)$/i, '-thumb.webp')} type="image/webp" />
                  <source srcSet={project.thumbnail.replace(/\.(png|jpe?g)$/i, '.avif')} type="image/avif" />
                  <source srcSet={project.thumbnail.replace(/\.(png|jpe?g)$/i, '.webp')} type="image/webp" />
                </>
              )}
              <img
                // The .png originals were removed from the repo/R2 — the
                // picture <source> list already serves avif/webp, and this
                // fallback also points at webp so a missing png can never
                // render the broken-image placeholder.
                src={project.thumbnail.replace(/\.(png|jpe?g)$/i, '.webp')}
                alt={project.title}
                loading="lazy"
                decoding="async"
                draggable="false"
                onError={(e) => {
                  if (project.isVideo) {
                    (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/rc6GzCBa2LY/hqdefault.jpg';
                  }
                }}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 select-none"
              />
            </picture>
          </div>
        </div>
        <div className="p-4 sm:p-6 flex-1 flex flex-col">
          <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-teal-400 transition-colors">{project.title}</h3>
          <p className="text-neutral-400 text-[13px] sm:text-sm mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed">{project.description}</p>
          {project.tags && (
            <div className="flex gap-2 flex-wrap mt-3 sm:mt-4">
              {project.tags.map((t) => (
                <span
                  key={t}
                  {...(tagTooltips[t] ? getSectionHandlers(tagTooltips[t]) : {})}
                  className={`bg-white/5 text-neutral-400 text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg ${tagTooltips[t] ? 'cursor-help' : ''}`}
                >{t}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-5">
            {project.url && <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-center px-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border border-white/10 text-white hover:bg-white/5 inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              {project.isVideo ? t('progetti.watch', lang) : t('progetti.visit', lang)}
              <TiaIcon icon={project.isVideo ? PlayIcon : ExternalLinkIcon} size={15} strokeWidth={2} className="shrink-0" />
            </a>}
            <button
              onClick={(e) => { e.stopPropagation(); scrollToContatti({ service: project.title, message: `Interesse per il progetto: ${project.title}` }); }}
              className="flex-1 text-center px-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all bg-teal-600 text-white hover:bg-teal-500 whitespace-nowrap"
            >
              {t('progetti.quote', lang)}
            </button>
          </div>
        </div>
      </div>
    </BorderGlow>
  );

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
        <div
          className="fixed inset-x-0 top-0 z-20 pointer-events-none"
          style={{
            opacity: chatFullscreen ? 0 : 1,
            transition: 'opacity 0.35s ease',
          }}
        >
          <ProgressiveBlur
            className=""
            height="4.5rem"
            position="top"
            blurLevels={[2, 6, 14]}
          />
        </div>
        <div
          className="fixed inset-x-0 bottom-0 z-20 pointer-events-none"
          style={{
            opacity: blurBottomHidden || chatFullscreen ? 0 : 1,
            transition: 'opacity 0.35s ease',
          }}
        >
          <ProgressiveBlur
            className=""
            height="clamp(6rem, 8vw, 8rem)"
            position="bottom"
            blurLevels={[2, 6, 14]}
          />
        </div>
        <div ref={turnstileContainerRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0" />

          {/* Fixed molten-metal background — visible (and animating) only
              through the transparent sections below the hero; the hero and the
              footer keep their own opaque backgrounds and cover it. */}
          <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
            <MoltenMetal
              color1="#05bc8e"
              color2="#0effc1"
              color3="#ffffff"
              speed={0.25}
              scale={5.5}
              detail={2}
              glow={2.3}
              coreSize={0.1}
              swirl={1.35}
              fold={-0.26}
              blackPoint={0.03}
              brightness={0.3}
              colorMode="molten"
              grain
              grainIntensity={0.06}
              mouseInteraction={false}
              mouseStrength={0.15}
              opacity={1}
            />
          </div>

        <div className="relative z-10 text-neutral-200 font-sans">

          {/* ============ HERO ============ */}
          {/* Mobile: content starts near the top (items-start + pt-20) with a
              generous bottom clearance (pb-56) so the stats row (clienti,
              risposta, pagamento) sits comfortably ABOVE the floating CTA + chat
              bubble instead of being covered by them. Desktop keeps the original
              vertical centering (sm:items-center, no paddings). */}
          {/* Section is transparent: the dark base + dither live inside a
              masked container (.hero-bottom-curtain) whose bottom edge fades
              radially into the molten background — the hero no longer ends
              with a hard line against the sections below. */}
          <section ref={heroRef} data-molten-cover="hero" className="relative min-h-screen w-full overflow-hidden flex items-start sm:items-center hero-banner-pad pt-20 pb-56 sm:pt-0 sm:pb-0">
            {/* The dither: an always-rendered static teal texture guarantees
                hero contrast on every device; the animated WebGL waves paint
                over it where supported. It pauses rendering off-screen. */}
            {/* React Bits configuration with the site's teal — deeper, less
                luminous than the previous mint (G=0.72, B=0.62 → not too
                green), pixelated via the per-channel 8x8 dither with
                pixelSize 2. */}
            <div className="absolute inset-0 z-0 hero-bottom-curtain" style={{ background: '#010101' }}>
            {/* Mount the WebGL Dither only after the splash completes: the
                splash covers the hero until then, so three.js (a ~230KB chunk)
                used to download AND execute on the critical path at load,
                blocking the first paint (the "unused JS" ~900ms). Deferring the
                mount moves the whole chunk off the LCP/TBT path — the static
                fallback inside Dither renders instantly and covers the brief
                transition, so the hero never shows a gap. */}
            {splashDone && (
            <Dither
              waveColor={[0.16470588235294117, 0.7176470588235294, 0.6235294117647059]}
              waveSpeed={0.07}
              waveFrequency={5.2}
              waveAmplitude={0.32}
              colorNum={8.6}
              pixelSize={2}
              enableMouseInteraction={true}
              mouseRadius={0.1}
            />
            )}
            </div>

            {/* Mobile-first sizing: the hero must read as a confident
                statement, not a wall of text. Base sizes are tuned for a
                375px viewport and scale up at sm/md/lg. */}
            <div className="relative z-20 text-left px-5 sm:px-12 md:px-20 lg:px-28 max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-[90rem] pointer-events-none">
              <p className="hero-anim mb-2 sm:mb-6" style={{ transform: `translateY(${HERO.yOffset}px) scale(${HERO.scale})`, filter: `blur(${HERO.blur}px)` }}>
                <span className="inline-block bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-2xl px-3 sm:px-5 py-1.5 sm:py-2 text-teal-400/90 text-[10px] sm:text-xs md:text-sm tracking-[0.18em] sm:tracking-[0.2em] uppercase font-semibold">
                  {t('hero.tag', lang)}
                </span>
              </p>
              <h1 className="hero-anim max-[374px]:text-[30px] text-[34px] sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.1] sm:leading-[1.05]" style={{ transform: `translateY(${HERO.yOffset}px) scale(${HERO.scale})`, filter: `blur(${HERO.blur}px)` }}>
                {t('hero.line1', lang)}<br />
                <span className="font-bold text-teal-400"><span className="font-black text-white">{t('hero.line2a', lang)}</span> {t('hero.line2b', lang)} <span className="font-black text-white">{t('hero.line2c', lang)}</span> {t('hero.line2d', lang)}<span className="font-black text-white">{t('hero.line2e', lang)}</span></span>
              </h1>
              <p className="hero-anim mt-3 sm:mt-8 text-white text-[13px] sm:text-base md:text-lg max-w-sm sm:max-w-xl font-medium leading-relaxed relative" style={{ transform: `translateY(${HERO.yOffset}px) scale(${HERO.scale})`, filter: `blur(${HERO.blur}px)` }}>
                <span className="absolute inset-0 blur-3xl opacity-60 bg-teal-400/20 rounded-full scale-150 -z-10 pointer-events-none" />                {t('hero.subtitle', lang)}
              </p>
              <div className="hero-anim mt-4 sm:mt-12 flex flex-col sm:flex-row gap-2.5 sm:gap-5 justify-start items-stretch sm:items-center" style={{ transform: `translateY(${HERO.yOffset}px) scale(${HERO.scale})`, filter: `blur(${HERO.blur}px)` }}>
                <button
                  onClick={() => { scrollToContatti(); trackClick('hero_cta_quote'); }}
                  className="w-full sm:w-auto px-5 sm:px-9 py-3 sm:py-4 bg-teal-500 text-white rounded-full text-[13px] sm:text-[15px] font-semibold hover:bg-teal-400 transition-all shadow-xl shadow-teal-500/25 pointer-events-auto tracking-wide inline-flex items-center justify-center gap-2 sm:gap-2.5"
                >
                  <TiaIcon icon={FilePenIcon} size={17} strokeWidth={2} />
                  {t('hero.cta_quote', lang)}
                </button>
                <button
                  onClick={() => { scrollToElementAfterLayout('prezzi', () => lenis.current); trackClick('hero_cta_prices'); }}
                  className="w-full sm:w-auto px-5 sm:px-9 py-3 sm:py-4 bg-white/[0.06] backdrop-blur-lg border border-white/15 text-white rounded-full text-[13px] sm:text-[15px] font-semibold hover:bg-white/15 hover:border-white/30 transition-all shadow-lg shadow-black/20 pointer-events-auto tracking-wide inline-flex items-center justify-center gap-2 sm:gap-2.5"
                >
                  <TiaIcon icon={DollarSignIcon} size={17} strokeWidth={2} />
                  {t('hero.cta_prices', lang)}
                </button>
                <button
                  onClick={() => { scrollToElementAfterLayout('progetti', () => lenis.current); trackClick('hero_cta_work'); }}
                  className="w-full sm:w-auto px-2 sm:px-3 py-2.5 sm:py-4 text-white/80 hover:text-white rounded-full text-[13px] sm:text-[15px] font-medium transition-all inline-flex items-center justify-center gap-2 group pointer-events-auto tracking-wide"
                >
                  {t('hero.cta_work', lang)}
                  <TiaIcon icon={ArrowRight01Icon} size={19} className="transition-transform group-hover:translate-x-1" strokeWidth={2} />
                </button>
              </div>

              {/* ── Inline Stats Row — clienti, risposta, pagamento ── */}
              <div className="hero-anim mt-4 sm:mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-5 text-[11px] sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <HeroGlow stagger={0}><span className="text-teal-400 text-sm sm:text-lg font-bold"><CountUp target={15} delay={HERO_COUNTUP_DELAYS[0]} ready={splashDone} className="" />+</span></HeroGlow>
                  <span className="text-white/80">{t('hero.stat_clients', lang)}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <HeroGlow stagger={1}><span className="text-teal-400 text-sm sm:text-lg font-bold">&lt;<CountUp target={1} delay={HERO_COUNTUP_DELAYS[1]} ready={splashDone} className="" />h</span></HeroGlow>
                  <span className="text-white/80">{t('hero.stat_response', lang)}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <HeroGlow stagger={2}><span className="text-teal-400 text-sm sm:text-lg font-bold"><CountUp target={30} delay={HERO_COUNTUP_DELAYS[2]} ready={splashDone} className="" />/<CountUp target={30} delay={HERO_COUNTUP_DELAYS[3]} ready={splashDone} className="" />/<CountUp target={40} delay={HERO_COUNTUP_DELAYS[4]} ready={splashDone} className="" /></span></HeroGlow>
                  <span className="text-white/80">{t('hero.stat_payment', lang)}</span>
                </div>
              </div>
            </div>

            {/* Progressive blur under the hero — the transition into the
                sections below: the dark dither fades out cleanly (linear
                mask on .hero-bottom-curtain) and the molten background
                emerges progressively blurred — no hard line, no radial
                "tear". Pure masked backdrop-filter layers, static — no
                per-frame re-sampling. */}
            <ProgressiveBlur
              className="z-10"
              height="clamp(5rem, 12vh, 8rem)"
              position="bottom"
              blurLevels={[2, 6, 14]}
            />

          </section>

          {/* ============ SERVIZI ============ */}
          <LazySection rootMargin={400} placeholderHeight={800}>
          <section id="servizi" className="py-10 sm:py-24 px-4">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('servizi.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('servizi.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('servizi.subtitle', lang)}
                </p>
              </ScrollReveal>
              <MobileSnapSlider
                ariaLabel={t('servizi.slider_label', lang)}
                trackClassName="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-3 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:snap-none max-w-[54em] mx-auto relative lg:auto-rows-[minmax(180px,auto)]"
              >
                {/* ═══ DESIGN CARDS ═══ */}
                {/* Card 1 — Brand Identity & Logo */}
                <ScrollReveal delay={0.12} xOffset={-60} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:1] md:[grid-row:1] lg:[grid-column:1] lg:[grid-row:1]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.15} xOffset={-40} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:2] md:[grid-row:1] lg:[grid-column:2] lg:[grid-row:1]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0} xOffset={60} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:3] md:[grid-row:1_/_span_2] lg:[grid-column:3_/_span_2] lg:[grid-row:1_/_span_2]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.05} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:1_/_span_2] md:[grid-row:2] lg:[grid-column:1_/_span_2] lg:[grid-row:2]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.18} xOffset={-50} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:1] md:[grid-row:3] lg:[grid-column:1] lg:[grid-row:3]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.1} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:2] md:[grid-row:3] lg:[grid-column:2_/_span_2] lg:[grid-row:3]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.22} xOffset={50} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:3] md:[grid-row:3] lg:[grid-column:4] lg:[grid-row:3]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.12} xOffset={-40} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:1] md:[grid-row:4] lg:[grid-column:1_/_span_2] lg:[grid-row:4]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
                <ScrollReveal delay={0.16} xOffset={40} className="shrink-0 snap-start w-[85%] sm:w-[60%] md:w-auto md:[grid-column:2] md:[grid-row:4] lg:[grid-column:3_/_span_2] lg:[grid-row:4]">
                  <DotGridCard>{(mounted, fadeIn) => (<TiltCard className="h-full"><BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] max-sm:min-h-[220px] group">
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
              </MobileSnapSlider>
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
          {/* contain: 'paint' would clip the BorderGlow edge-light that paints
              outside the section bounds — use layout+style only, and let the
              glow escape. The section is still cheap (LazySection lazy-mounts). */}
          <section id="progetti" className="py-10 sm:py-24 px-4" style={{ contain: 'layout style' } as React.CSSProperties}>
            <div className="max-w-7xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('progetti.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('progetti.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('progetti.subtitle', lang)}
                </p>
              </ScrollReveal>

              {/* ── Filter Buttons ── */}
              <div className="flex justify-center gap-2 sm:gap-3 mb-6 sm:mb-12 flex-wrap">
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

              <MobileSnapSlider
                key={activeFilter}
                ariaLabel={t('progetti.slider_label', lang)}
                trackClassName="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-3 md:hidden"
              >
                {filteredProjects.map((project) => (
                  <div key={project.id} className="shrink-0 snap-start w-[85%] sm:w-[60%] cursor-pointer" onClick={() => setSelectedProject(project)}>
                    {renderProjectCard(project)}
                  </div>
                ))}
              </MobileSnapSlider>

              {/* No contentVisibility on the card wrappers: it applies
                  contain: paint, which clips the BorderGlow edge-light
                  (28px) that paints outside the card → the glow was cut on
                  desktop. With only 3 cards per view the lazy benefit is
                  negligible; the section is already LazySection-lazy. */}
              <StaggerReveal key={`${activeFilter}-${projectsPage}`} stagger={STAGGER_BY_SECTION.progetti} className="hidden md:grid md:grid-cols-3 gap-7">
                {pagedProjects.map((project) => (
                  <div key={project.id} className="cursor-pointer" onClick={() => setSelectedProject(project)}>
                    {renderProjectCard(project)}
                  </div>
                ))}
              </StaggerReveal>

              {projectTotalPages > 1 && (
                <div className="mt-10 hidden md:flex items-center justify-center gap-4" aria-label={projectNavigationLabel}>
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
          <section id="chisono" className="relative py-10 sm:py-24 px-4 overflow-x-clip overflow-y-visible">
            {/* ── Two big edge curtains — one per side, spanning the WHOLE section.
               They hide the duplicated skill cards at the marquee edges with a
               smooth fade, and because they're as tall as the section they also
               cover the BorderGlow halo (~22px around every card) that used to
               leak above and below the old short per-row curtains — on mobile
               and desktop alike. Two layers instead of two-per-row (12 total):
               much less GPU compositing. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-10"
              style={{ left: 'calc(-50vw + 50%)', width: '100vw' }}
            >
              <div
                className="marquee-edge-curtain marquee-edge-curtain--left"
                style={{ '--marquee-edge-bg': 'rgba(2, 12, 10, 0.34)', '--marquee-edge-fade': 'rgba(2, 12, 10, 0.12)' } as React.CSSProperties}
              />
              <div
                className="marquee-edge-curtain marquee-edge-curtain--right"
                style={{ '--marquee-edge-bg': 'rgba(2, 12, 10, 0.34)', '--marquee-edge-fade': 'rgba(2, 12, 10, 0.12)' } as React.CSSProperties}
              />
            </div>
            {/* Content layer above the terminal */}
            <div className="relative z-10 max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-16">
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
                        {/* Per-row curtains removed: the BorderGlow halo (~22px
                            around each card) leaked past their short top/bottom
                            edges. The two big section-level curtains in the
                            #chisono section now span the whole section height
                            and cover both the duplicate cards AND their glow. */}
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
          </LazySection>

          {/* ============ CHATBOT ============ */}
          {/* Eager section (NOT lazy): the chatbot used to sit inside the
              #chisono LazySection — a 1200px placeholder vs ~2200px of real
              content made the document jump while scrolling past it (the
              "scroll stops then restarts" hiccup). It is cheap to keep
              mounted; the expensive WebGL/marquee work lives in the sections
              around it. pt/sm:pt clears the fixed navbar, pb/sm:pb keeps the
              section vertically balanced inside its one-viewport height.
              overflow-x-clip guarantees no horizontal scroll from any
              residual glow. */}
          {/* h-[100svh] (small viewport) instead of dvh: the mobile URL bar
              show/hide changes dvh and reflows the section mid-scroll — one
              more source of the up/down jitter. svh is stable. */}
          <section id="chatbot" className="relative h-[100svh] flex flex-col px-6 sm:px-4 pt-16 sm:pt-20 pb-6 sm:pb-10 overflow-x-clip">
            {/* Radial "blur" behind the chat — a STATIC radial-gradient overlay
                (pure paint, no backdrop-filter): darker at the center and
                transparent at the edges, so the chat reads as a soft depth
                pocket against the animated molten without any per-frame
                re-sampling (which would lag the section). pointer-events-none,
                sits below the panel content. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background: 'radial-gradient(ellipse 85% 75% at 50% 55%, rgba(2, 12, 10, 0.78) 0%, rgba(2, 12, 10, 0.45) 45%, transparent 78%)',
              }}
            />
            <div className="relative z-10 max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0">
              <div
                id="chatbot-heading"
                className="scroll-mt-[9rem] shrink-0"
                style={{ scrollMarginTop: '9rem' }}
              >
                {/* Heading kept identical on desktop; on mobile it's compact
                    (smaller margins, subtitle clamped to 2 lines) so the chat
                    itself — messages + bar + specializations — fits in one
                    screen without removing any content. */}
                <ScrollReveal className="text-center mb-3 sm:mb-6" start="top 85%" end="bottom 25%">
                  <p className="text-teal-400 text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-2 sm:mb-4">Preventivo</p>
                  <h2 className="text-2xl sm:text-5xl font-bold tracking-tight text-white">{t('chatbot.title', lang)}</h2>
                  <p className="text-neutral-400 mt-2 sm:mt-4 max-w-lg mx-auto text-[13px] sm:text-base leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {t('chatbot.subtitle', lang)}
                  </p>
                </ScrollReveal>
              </div>
              <ChatbotPanel
                messages={botMessages}
                typing={botTyping}
                input={botInput}
                onInputChange={setBotInput}
                onSend={() => sendBotMessage()}
                category={chatCategory}
                onSelectCategory={selectChatCategory}
                chatStarted={chatStarted}
                chatBlocked={chatBlocked}
                onReset={resetChat}
                messagesRef={botMessagesRef}
                inputRef={botInputRef}
                onSuggestion={(sugg) => {
                  setBotInput(sugg);
                  setTimeout(() => sendBotMessage(sugg), 50);
                }}
                renderBotText={(msg, isFormStale) => renderBotMessage(msg.text, msg.prefill, msg.requiresApproval, msg.id, msg.approvalState, isFormStale)}
              />
            </div>
          </section>

          {/* ============ RECENSIONI ============ */}

          <LazySection rootMargin={400} placeholderHeight={500}>
          <section id="recensioni" className="py-10 sm:py-24 px-4">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('recensioni.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('recensioni.title', lang)}</h2>
              </ScrollReveal>

              {/* ── Two-column opposing vertical scrollers ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative h-[400px] sm:h-[540px] overflow-visible py-5 isolate">
                {/* Real progressive-blur curtains top & bottom — 3 overlapping
                    backdrop-filter layers each. The strongest 14px layer sits
                    at the edge and the section remains overflow-visible, so the
                    transition dissolves into Molten without a hard black clip. */}
                <div className="absolute -top-1 left-0 right-0 h-[calc(4rem+1px)] sm:h-[calc(6rem+1px)] z-20 pointer-events-none">
                  <ProgressiveBlur position="top" height="100%" blurLevels={[2, 6, 14]} />
                </div>
                <div className="absolute -bottom-1 left-0 right-0 h-[calc(4rem+1px)] sm:h-[calc(6rem+1px)] z-20 pointer-events-none">
                  <ProgressiveBlur position="bottom" height="100%" blurLevels={[2, 6, 14]} />
                </div>
                {/* ── Left column — scrolls up ── */}
                <div className="relative min-h-0 overflow-hidden py-5 -my-5">
                  <InfiniteSlider
                    gap={16}
                    duration={45}
                    durationOnHover={18}
                    direction="vertical"
                    overflowY="visible"
                  >
                    {reviews.slice(0, 4).map((review, idx) => renderReviewCard(review, `left-${idx}`))}
                  </InfiniteSlider>
                </div>
                {/* ── Right column — scrolls down ── */}
                <div className="relative min-h-0 overflow-hidden hidden md:block py-5 -my-5">
                  <InfiniteSlider
                    gap={16}
                    duration={40}
                    durationOnHover={16}
                    direction="vertical"
                    reverse
                    overflowY="visible"
                  >
                    {reviews.slice(4, 8).map((review, idx) => renderReviewCard(review, `right-${idx}`))}
                  </InfiniteSlider>
                </div>
              </div>
            </div>
          </section>
          </LazySection>

          {/* ============ PROCESSO ============ */}
          <LazySection rootMargin={400} placeholderHeight={700}>
          <section id="processo" className="py-10 sm:py-24 px-4">
            <div className="max-w-7xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-16">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('processo.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('processo.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('processo.subtitle', lang)}
                </p>
              </ScrollReveal>
              <ProcessTimeline />
            </div>
          </section>
          </LazySection>

          {/* ============ PREZZI ============ */}
          <LazySection rootMargin={400} placeholderHeight={900}>
          <section id="prezzi" className="py-10 sm:py-24 px-4">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-12">
                <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">{t('prezzi.label', lang)}</p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{t('prezzi.title', lang)}</h2>
                <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                  {t('prezzi.subtitle', lang)}
                </p>
                <p className="text-neutral-500 mt-2 text-xs mx-auto">
                  {t('prezzi.vat_note', lang)}
                </p>
              </ScrollReveal>

              {/* ── Toggle ── */}
              <div className="flex justify-center mb-8 sm:mb-16">
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
                <div key={ci} className={ci < pricing.length - 1 ? 'mb-8 sm:mb-16' : ''}>
                  <h3 className="text-white text-xl font-semibold mb-2 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    {cat.label}
                  </h3>
                  <p className="text-neutral-500 text-sm mb-5 sm:mb-8 ml-5">{cat.subtitle}</p>
                  <ScrollReveal>
                    <MobileSnapSlider
                      ariaLabel={`${cat.label} — ${t('prezzi.slider_label', lang)}`}
                      trackClassName="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none"
                    >
                    {cat.tiers.map((tier, ti) => (
                      // No h-full here: in an auto-height flex row a percentage
                      // height doesn't resolve, so cards kept their natural
                      // height and looked uneven. Without it the wrapper
                      // stretches to the tallest card (align-items: stretch)
                      // and the h-full chain inside resolves → equal heights
                      // on mobile AND on the desktop grid.
                      <div key={ti} className="shrink-0 snap-start w-[90%] sm:w-[60%] md:w-auto">
                      <PriceCard
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
                      </div>
                    ))}
                    </MobileSnapSlider>
                  </ScrollReveal>
                </div>
              ))}
              {isMonthly && (
                <p className="text-center text-xs text-neutral-500 mt-10 sm:mt-14">{t('prezzi.flex_note', lang)}</p>
              )}
            </div>
          </section>
          </LazySection>

          {/* ============ FAQ ============ */}
          <LazySection rootMargin={400} placeholderHeight={900}>
            <div id="faq" className="scroll-mt-[9rem]">
            <FaqScroller
              mainTitle={t('faq.title', lang)}
              mainSubtitle={t('faq.subtitle', lang)}
              rows={[
                {
                  id: 'row1',
                  speed: '55s',
                  direction: 'right',
                  faqItems: FAQS.slice(0, 7).map((faq, i) => ({ id: `faq-row1-${i}`, question: faq.q, answer: faq.a })),
                },
                {
                  id: 'row2',
                  speed: '48s',
                  direction: 'left',
                  faqItems: FAQS.slice(7, 14).map((faq, i) => ({ id: `faq-row2-${i}`, question: faq.q, answer: faq.a })),
                },
                {
                  id: 'row3',
                  speed: '62s',
                  direction: 'right',
                  faqItems: FAQS.slice(14, 20).map((faq, i) => ({ id: `faq-row3-${i}`, question: faq.q, answer: faq.a })),
                },
              ]}
            />
            </div>
          </LazySection>

          {/* ============ CONTATTI ============ */}
          <div id="contatti-anchor" className="h-0 w-0 overflow-hidden" aria-hidden="true" />
          <LazySection rootMargin={400} placeholderHeight={900}>
          <section id="contatti" className="py-10 sm:py-24 px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal className="text-center mb-8 sm:mb-16" start="top 85%" end="bottom 25%">
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
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <TiaIcon icon={FilePenIcon} size={11} className="text-teal-400 shrink-0" strokeWidth={2} />
                        <span>{t('contatti.vat_invoice', lang)}</span>
                      </div>
                    </div>
                  </BorderGlow>
                </div>
              </StaggerReveal>
            </div>
          </section>
          </LazySection>

          {/* ============ FOOTER ============ */}
          <div ref={footerRef} data-molten-cover="footer">
            <FooterAnimation lang={lang} onOpenLegal={(doc) => setLegalDoc(getLegalDoc(lang, doc) ?? null)} />
          </div>

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
        {/* ── Floating Chat Widget ──
             Apple-style snap — MOBILE ONLY: while the CTA sits at the bottom
             the bubble floats just ABOVE it (right-aligned) so they never
             overlap; it drops to the bottom-right corner otherwise. On
             DESKTOP the bubble is always in the bottom-right corner (the CTA
             is centered, so there is nothing to avoid). The window inside
             this container is anchored bottom-0, so its base is always at the
             same height as the bubble's base. When the on-screen keyboard
             opens (kbOffset > 0) the whole widget is lifted above it and the
             transition is disabled so it follows the keyboard without lag. */}
        <div
          ref={chatWidgetRef}
          className={`fixed right-4 sm:right-6 z-50 pointer-events-auto ${kbOffset === 0 ? 'transition-[bottom] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]' : ''}`}
          style={{ bottom: (isMobile && ctaVisible && !ctaHiding && !ctaDocked ? 124 : (isMobile ? 16 : 24)) + kbOffset }}
        >
          {/* Chat popup */}
          {(chatOpen || chatClosing) && (
            <BorderGlow
              continuousHover
              singleBeam
              borderRadius={16}
              glowRadius={28}
              glowIntensity={1.4}
              edgeSensitivity={0}
              backgroundColor="rgba(6, 10, 10, 0.78)"
              className={`absolute bottom-0 right-0 w-[min(calc(100vw_-_2rem),340px)] chat-window-h ${chatClosing ? 'opacity-0 translate-y-2 scale-95 transition-all duration-300' : 'chat-pop-up'}`}
              style={kbOffset > 0 ? { height: `min(70dvh, calc(100dvh - ${kbOffset + 20}px))` } : undefined}
            >
              {/* overflow-hidden here (NOT on .border-glow-card): clips the
                  title-bar background to the rounded-2xl corners. The BorderGlow
                  lives on the parent card's pseudo-elements + .edge-light, which
                  are siblings — clipping this child never touches the glow. */}
              <div role="dialog" aria-modal="true" aria-label="Chat con Tia Chinaglia" className="w-full h-full bg-[rgba(6,10,10,0.62)] rounded-2xl overflow-hidden flex flex-col">
                {/* Title bar */}
                <div className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-[#1a1a1a]/60 backdrop-blur-xl select-none">
                  {/* Centered title */}
                  <span className="flex-1 text-center text-xs font-medium text-neutral-300 tracking-wide">{t('chat.title', lang)}</span>
                  {/* Close button */}
                  <button
                    onClick={() => { setChatClosing(true); setTimeout(() => { setChatOpen(false); setChatClosing(false); setKbOffset(0); }, 300); }}
                    className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-colors text-neutral-500 hover:text-white shrink-0"
                    aria-label="Chiudi chat"
                  >
                    <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Messages area — native scroll via Lenis allowNestedScroll:
                   the chat scrolls itself and at its boundary the wheel chains
                   to the page (Lenis stays in sync — no fight, no jitter). */}
                <div ref={chatMessagesRef} className="flex-1 px-5 py-4 min-h-0 overflow-y-auto flex flex-col gap-3 relative">
                  {/* Subtle DotGrid background — always mounted, static for perf */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06]">
                    <DotGrid dotSize={2} gap={18} baseColor="#0a0a0a" activeColor="#2dd4bf" proximity={0} shockRadius={0} shockStrength={0} resistance={0} returnDuration={0} />
                  </div>

                  {messages.map((msg) => (
                    msg.sender === 'system' ? (
                      // Neutral system notice (e.g. delivery failure) — centered,
                      // dim, clearly not a message from either side.
                      <div key={msg.id} className="flex justify-center">
                        <span className="max-w-[85%] rounded-full bg-white/[0.04] px-3 py-1 text-[11px] leading-relaxed text-center text-neutral-500">{msg.text}</span>
                      </div>
                    ) : (
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
                        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed break-words min-w-0 ${msg.sender === 'client'
                          ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white/[0.04] text-white rounded-2xl rounded-bl-sm'
                          }`}
                      >
                        {linkifyChatText(msg.text, msg.sender === 'client')}
                      </div>
                      {msg.sender === 'client' && (
                        <div className="w-7 h-7 rounded-full bg-teal-600/30 flex items-center justify-center shrink-0">
                          <TiaIcon icon={UserIcon} size={14} className="text-teal-300" />
                        </div>
                      )}
                    </div>
                    )
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

                {/* Input — desktop autofocuses for convenience; on mobile the
                    keyboard must NOT auto-open (it would jump/resize the whole
                    page while the window animates in): the user taps the bar
                    to type, and the visualViewport lift keeps it visible. */}
                <div className="px-5 pb-5 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={chatTextareaRef}
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder={t('chat.placeholder', lang)}
                      rows={1}
                      autoFocus={!isMobile}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/40 focus:shadow-[0_0_14px_rgba(45,212,191,0.12)] resize-none placeholder-neutral-600 transition-shadow duration-200"
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
              if (chatOpen) {
                setChatClosing(true);
                setTimeout(() => { setChatOpen(false); setChatClosing(false); setKbOffset(0); }, 300);
              } else {
                playChatOpenSound();
                setChatOpen(true);
                logAnalytics('chat_open');
              }
            }}
            className={`relative p-4 text-white rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${chatOpen ? 'bg-[#0f0f0f] scale-0 opacity-0 pointer-events-none' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-500/15'
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
              className={`absolute bottom-1 left-1 w-3.5 h-3.5 rounded-full border-2 border-[#010101] transition-all duration-500 ${chatOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'} ${isOnline ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)] animate-pulse' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.45)] animate-pulse-slow'}`}
              aria-label={isOnline ? 'Disponibile' : 'Non disponibile'}
              title={isOnline ? 'Disponibile' : 'Non disponibile'}
            />
          </button>
        </div>

        {/* Floating Curved CTA — docks at the top with inverted curve when
             the chatbot enters the viewport, returns to the bottom otherwise.
             On mobile the docked state shrinks into a small pill inside the
             navbar row (between the logo and the burger): it must sit above
             the navbar header (z-9999) to stay clickable, but still below the
             burger menu (z-10001) and every modal. */}
        <div
          className={`fixed left-0 right-0 flex justify-center px-4 sm:px-0 pointer-events-none transition-[top,bottom] duration-[350ms] ${ctaDocked && isMobile ? 'z-[10000]' : 'z-[50]'}`}
          style={ctaDocked
            ? (isMobile ? { top: '4px' } : { bottom: 'calc(100vh - 88px)' })
            : { bottom: '24px' }
          }
        >
          <div
            className="w-full sm:w-auto flex justify-center"
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
              showSparkle={!ctaDocked || !isMobile}
              bend={ctaDocked ? (isMobile ? -8 : -22) : 14}
              height={ctaDocked && isMobile ? 36 : 48}
              width={ctaDocked && isMobile ? 236 : 360}
              fontSize={ctaDocked && isMobile ? 13 : 14}
              backgroundColor="#ffffff06"
              textColor="#ffffff"
              borderColor="#ffffff12"
              arrowColor="#ffffff"
              arrowUp={ctaDocked}
              tooltip={showCtaTooltip ? t('bot.tooltip_raccontami', lang) : undefined}
              onClick={() => {
                logAnalytics('cta_floating_open_chatbot');
                navigator.vibrate?.(30);

                // Scroll so the WHOLE section fills the viewport: target the
                // section itself with offsetPx -120 (cancels the BASE_OFFSET)
                // so its top is flush with the viewport top and everything is
                // visible — nothing under the progressive blur (the bottom
                // blur hides while the section fills the screen). preventScroll
                // on focus: focusing the input must never trigger a second
                // native scroll-into-view that yanks the page down.
                scrollToElementAfterLayout('chatbot', () => lenis.current, {
                  offsetPx: -120,
                  duration: 1.0,
                  onComplete: () => {
                    window.setTimeout(() => botInputRef.current?.focus({ preventScroll: true }), 300);
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
