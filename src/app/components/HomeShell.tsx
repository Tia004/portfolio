'use client';

/** @category React e Core */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';

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
  BlenderIcon,

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
import SmoothScrollProvider from './SmoothScroll';
import Dither from './Dither';
import GradualBlur from './GradualBlur';
import Navbar from './Navbar';
import FaqScroller from './FaqScroller';
import ScrollReveal from './ScrollReveal';
import FooterAnimation from './FooterAnimation';
import BorderGlow from './BorderGlow';
import DotGrid from './DotGrid';
import TooltipContent from './TooltipContent';

/** @category Hooks */
import { useTooltip } from '@/lib/useTooltip';

/** @category Dati e Config */
import { TOOLTIP_MAP } from '@/lib/tooltips';

// ── Custom ServiceSelect (grouped by macro-area) ─────────────

interface GroupItem {
  value: string;
  label: string;
}

interface ServiceGroup {
  label: string;
  items: GroupItem[];
}

const SERVICE_GROUPS: ServiceGroup[] = [
  {
    label: 'Design',
    items: [
      { value: 'Brand & Logo', label: 'Brand & Logo' },
      { value: 'Grafica & Social', label: 'Grafica & Social' },
      { value: 'UI/UX Design', label: 'UI/UX Design' },
    ],
  },
  {
    label: 'Sviluppo',
    items: [
      { value: 'Sito Web', label: 'Sito Web' },
      { value: 'Software & App', label: 'Software & App' },
    ],
  },
  {
    label: 'Video',
    items: [
      { value: 'Contenuti Video', label: 'Contenuti Video' },
      { value: 'Post-Produzione', label: 'Post-Produzione' },
    ],
  },
  {
    label: 'Altro',
    items: [
      { value: 'Altro', label: 'Altro' },
    ],
  },
];

const ALL_OPTIONS = SERVICE_GROUPS.flatMap(g => g.items);

function ServiceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
    <div ref={containerRef} className="p-5 relative">
      <label className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-3">Servizio</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-2 text-left text-sm transition-all group"
      >
        <span className={value ? 'text-white' : 'text-neutral-500'}>
          {selected?.label || 'Seleziona un servizio'}
        </span>
        <svg aria-hidden="true" className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-3 right-3 mt-1 z-[100] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl">
          {SERVICE_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="mx-4 h-px bg-white/[0.06]" />}
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-teal-400/70">
                {group.label}
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
                  {opt.label}
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
}) {
  const { getHandlers } = useTooltip(onTooltipShow, onTooltipHide, { showDelay: 300, hideDelay: 100 });
  const dlvHandlers = getHandlers('La deadline definitiva viene concordata insieme dopo aver analizzato il progetto. Ogni progetto enterprise ha tempistiche personalizzate.');
  const rapidaHandlers = getHandlers('Questo servizio ha tempi di consegna ridotti, perfetto per esigenze urgenti.');

  return (
    <BorderGlow
      continuousHover
      borderRadius={20}
      glowRadius={35}
      glowIntensity={2.0}
      edgeSensitivity={0}
      className={`[&_.border-glow-inner]:!overflow-visible ${premium ? 'border-teal-400/15' : ''}`}
    >
      <div className={`p-6 sm:p-8 flex flex-col rounded-[20px] relative ${premium ? 'bg-gradient-to-b from-teal-500/[0.06] to-transparent' : ''}`}>
        {popular && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full z-10">
            Più scelto
          </span>
        )}
        <h4 className={`font-semibold text-lg mb-1 flex items-center gap-2 ${premium ? 'text-teal-300' : 'text-white'}`}>
          {premium && (
            <svg aria-hidden="true" className="w-4 h-4 text-teal-400 shrink-0 drop-shadow-[0_0_4px_rgba(45,212,191,0.5)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.21 2.07a1 1 0 011.58 0l2.46 3.11a1 1 0 00.84.4l3.96.16a1 1 0 01.88 1.06l-.67 3.9a1 1 0 00.28.87l2.68 2.92a1 1 0 01-.25 1.58l-3.51 1.85a1 1 0 00-.51.74l-.67 3.9a1 1 0 01-1.48.7l-3.5-1.85a1 1 0 00-.9 0l-3.5 1.85a1 1 0 01-1.48-.7l-.67-3.9a1 1 0 00-.51-.74l-3.51-1.85a1 1 0 01-.25-1.58l2.68-2.92a1 1 0 00.28-.87l-.67-3.9a1 1 0 01.88-1.06l3.96-.16a1 1 0 00.84-.4l2.46-3.11z" />
            </svg>
          )}
          {title}
          {delivery === 'Su misura per te' && (
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
          {delivery.match(/giorni|24-48h|immediata|1-2 settimane/i) && (
            <span
              {...rapidaHandlers}
              className="ml-2 px-1.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-[9px] font-semibold uppercase tracking-wider text-teal-400 leading-none"
            >
              Consegna rapida
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
            <>
              <span className="text-neutral-400 text-sm align-top">da </span>
              <span className={`text-3xl sm:text-4xl font-bold ${premium ? 'text-teal-300' : 'text-white'}`}>€{price}</span>
              {period && <span className="text-neutral-500 text-sm ml-1">{period}</span>}
            </>
          ) : (
            <>
              <span className={`text-xl font-bold ${premium ? 'text-teal-300' : 'text-white'}`}>{priceLabel}</span>
              {period && <span className="text-neutral-500 text-sm ml-1">{period}</span>}
            </>
          )}
        </div>
        <ul className="space-y-3 flex-1 mb-6">
          {features.map((f, i) => {
            const tip = TOOLTIP_MAP[f];
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
          onClick={() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' })}
          className={`block w-full text-center py-3 rounded-full text-sm font-medium transition-all ${premium
            ? 'bg-teal-400 text-black font-semibold hover:bg-teal-300 shadow-lg shadow-teal-400/40 ring-1 ring-teal-400/50'
            : popular
              ? 'bg-teal-600 text-white hover:bg-teal-500'
              : 'border border-white/10 text-white hover:bg-white/5'
            }`}
        >
          Richiedi preventivo
        </button>
      </div>
    </BorderGlow>
  );
}

const REVIEWS = [
  { name: 'Marco R.', role: 'CEO, TechStart', text: 'Tia ha trasformato la nostra presenza online. Design pulito e performante, oltre ogni aspettativa.', stars: 5 },
  { name: 'Elena B.', role: 'Marketing Director', text: 'Professionista eccezionale. Ha capito subito cosa volevamo e lo ha realizzato alla perfezione.', stars: 5 },
  { name: 'Luca M.', role: 'Founder, DigitalAgency', text: 'Lavoro di altissima qualità. Ogni dettaglio curato, comunicazione impeccabile.', stars: 5 },
  { name: 'Sofia G.', role: 'Creative Director', text: 'Un talento raro. Unisce estetica e tecnica in modo magistrale. Consigliatissimo.', stars: 5 },
  { name: 'Andrea P.', role: 'Startup Founder', text: 'Consegna rapida, codice pulito, design mozzafiato. Cosa volere di più?', stars: 5 },
  { name: 'Chiara F.', role: 'E-commerce Manager', text: 'Il mio sito vende il doppio da quando Tia lo ha ridisegnato. Numeri alla mano.', stars: 5 },
];

const PROJECTS = [
  {
    id: 'gsa-hotels',
    title: 'GSA Hotels',
    description: 'Prototipo di sito luxury per struttura ricettiva di alto livello. Design raffinato, animazioni fluide e sistema di prenotazione interattivo.',
    url: 'https://gsa-hotels-demo.vercel.app/',
    thumbnail: '/uploads/gsahotels.png',
    category: 'Sviluppo' as const,
    tags: ['Next.js', 'Tailwind', 'Animazioni'],
  },
  {
    id: 'vergilius',
    title: 'Vergilius Nectar',
    description: 'Landing page per brand emergente. Visual identity curata, storytelling visivo d\'impatto e performance ottimizzate.',
    url: 'https://vergiliusnectar-github-io.vercel.app/',
    thumbnail: '/uploads/vergiliusnectar.png',
    category: 'Design' as const,
    tags: ['React', 'Branding', 'UI Design'],
  },
  {
    id: 'moretti',
    title: 'Studio Ing. Moretti',
    description: 'Sito professionale per studio di ingegneria. Design pulito, ottimizzato SEO e performance al top. Online e operativo.',
    url: 'https://www.studioingmoretti.it/',
    thumbnail: '/uploads/studioingmoretti.png',
    category: 'Sviluppo' as const,
    tags: ['Next.js', 'SEO', 'Sito Professionale'],
  },
  {
    id: 'pcs',
    title: 'PCS Mantova',
    description: 'Sito istituzionale per azienda del territorio mantovano. Struttura moderna, navigazione intuitiva e immagine coordinata.',
    url: 'https://pcsmantova-github-io.vercel.app/',
    thumbnail: '/uploads/pcsmantova.png',
    category: 'Sviluppo' as const,
    tags: ['Next.js', 'Design', 'Sviluppo'],
  },
  {
    id: 'canapa',
    title: 'Canapa Store',
    description: 'Concept store per prodotti naturali. Esperienza d\'acquisto fluida con design minimal, palette terrosa e attenzione al dettaglio.',
    url: 'https://canapa-store.vercel.app/',
    thumbnail: '/uploads/canapastore.png',
    category: 'Sviluppo' as const,
    tags: ['Next.js', 'E-commerce', 'UI Design'],
  },
  {
    id: 'showreel',
    title: 'Showreel Video',
    description: 'Montaggio video professionale con motion graphics, color grading e sound design. Produzione completa per brand e aziende.',
    url: 'https://youtu.be/rc6GzCBa2LY',
    thumbnail: 'https://img.youtube.com/vi/rc6GzCBa2LY/maxresdefault.jpg',
    isVideo: true,
    category: 'Video' as const,
    tags: ['Premiere Pro', 'After Effects', 'Color Grading'],
  },
];

const FAQS = [
  { q: 'Quanto costa un sito web?', a: 'Ogni progetto è unico. Dopo una consulenza gratuita, ti fornirò un preventivo personalizzato. I prezzi partono da €1.200 per un sito vetrina con brand identity inclusa.' },
  { q: 'Quanto tempo serve per un progetto?', a: 'Un sito vetrina richiede 2-3 settimane, un\'app mobile 4-8 settimane. Ti darò una timeline precisa dopo il briefing iniziale.' },
  { q: 'Offri manutenzione continuativa?', a: 'Sì, offro pacchetti mensili di manutenzione per siti, app e contenuti video. Puoi scegliere il piano più adatto nella sezione Prezzi alla voce Collaborazione.' },
  { q: 'Usi template o è tutto su misura?', a: 'Tutto su misura. Ogni progetto è progettato e sviluppato da zero con Next.js, React, React Native e tecnologie moderne. Nessun template, nessun compromesso.' },
  { q: 'Ti occupi anche di SEO?', a: 'Sì, ogni sito è ottimizzato per i motori di ricerca: struttura semantica, Core Web Vitals, performance, meta tag e best practice SEO on-page.' },
  { q: 'Fai anche video per social media?', a: 'Certo! Produco reel, short, contenuti verticali e video brand. Ho un pacchetto Social Pack da €450/mese nella sezione Collaborazione dei Prezzi.' },
  { q: 'Come funziona il processo di lavoro?', a: '1) Consulenza gratuita 2) Analisi e preventivo 3) Design e prototipo 4) Sviluppo 5) Test e revisioni 6) Consegna e lancio. Massima trasparenza in ogni fase.' },
  { q: 'Sviluppi anche app mobile?', a: 'Sì, sviluppo app iOS e Android con React Native (cross-platform) o native. MVP, app complete, integrazione con backend e API. Guarda la sezione Prezzi per i dettagli.' },
  { q: 'Posso richiedere solo il design senza sviluppo?', a: 'Assolutamente sì. Posso occuparmi solo della parte di UX/UI design, brand identity e prototipazione. Poi sarai libero di far sviluppare il progetto a chi preferisci.' },
  { q: 'Lavori con partita IVA?', a: 'Sì, opero come libero professionista con regolare partita IVA. Emetto fattura per ogni progetto e offro la massima trasparenza fiscale.' },
];

// ── Pricing data ──────────────────────────────────────────────

type PricingTier = {
  title: string;
  price?: string;
  priceLabel?: string;
  period: string;
  popular?: boolean;
  premium?: boolean;
  description: string;
  delivery: string;
  hours?: string;
  features: string[];
};

type PricingCategory = {
  label: string;
  subtitle: string;
  tiers: PricingTier[];
};

const PRICING_ONETIME: PricingCategory[] = [
  {
    label: 'Design',
    subtitle: 'Brand identity, grafica social, UI/UX e comunicazione visiva a 360°.',
    tiers: [
      { title: 'Brand Identity', price: '500', period: '', description: 'Logo, palette, tipografia e linee guida base', delivery: 'Consegna in 5-7 giorni', features: ['Logo e identità visiva', 'Palette colori e tipografia', 'Brand guidelines base', 'Carte da visita digitali'] },
      { title: 'Social & Graphic Pack', price: '900', period: '', popular: true, description: 'Post social, thumbnail, flyer, locandine e grafiche marketing', delivery: 'Consegna in 7-10 giorni', features: ['10 post social o thumbnail', 'Flyer / locandine / poster', 'Grafiche per streamer', 'Materiali marketing coordinati', 'Formati ottimizzati per ogni piattaforma'] },
      { title: 'Ecosistema Brand Completo', price: '2.800', period: '', premium: true, description: 'Identità visiva totale + UI/UX + comunicazione', delivery: 'Su misura per te', features: ['Brand strategy e posizionamento', 'Visual identity completa (logo, colori, font, pattern)', 'UI/UX design (sito o app)', 'Graphic system per social e print', 'Linee guida e asset kit completi'] },
    ],
  },
  {
    label: 'Sviluppo Web',
    subtitle: 'Siti web, dashboard, e-commerce e applicazioni web su misura.',
    tiers: [
      { title: 'Sito Web Professionale', price: '1.200', period: '', description: 'Sito vetrina o landing page responsive', delivery: 'Consegna in 2-3 settimane', features: ['UI/UX design personalizzato', 'Sviluppo Next.js / React', 'Responsive e mobile-first', 'SEO tecnico e performance'] },
      { title: 'Piattaforma Web', price: '3.500', period: '', popular: true, description: 'SaaS, marketplace, e-commerce o dashboard', delivery: 'Consegna in 4-6 settimane', features: ['Architettura full-stack scalabile', 'Backend e API integrate', 'Autenticazione e database', 'Pannello admin e dashboard', 'Deploy e CI/CD inclusi'] },
      { title: 'Soluzione Web Enterprise', priceLabel: 'Da €6.500', period: '', premium: true, description: 'Sistemi web complessi, multi-tenant, alta affidabilità', delivery: 'Su misura per te', features: ['Architettura cloud scalabile', 'Multi-tenancy e ruoli avanzati', 'Integrazioni API di terze parti', 'GDPR e compliance inclusi', 'Supporto e manutenzione 6 mesi'] },
    ],
  },
  {
    label: 'Software & App',
    subtitle: 'Applicazioni mobile, software su misura e sistemi backend.',
    tiers: [
      { title: 'MVP o App Mobile', price: '3.800', period: '', description: 'Per startup, PMI o tool interni', delivery: 'Consegna in 4-8 settimane', features: ['Analisi requisiti e architettura', 'Backend e API dedicate', 'Autenticazione e database', 'App mobile (React Native)'] },
      { title: 'Piattaforma Scalabile', priceLabel: 'Da €8.000', period: '', popular: true, description: 'Soluzioni enterprise, SaaS, sistemi complessi', delivery: 'Su misura per te', features: ['Architettura modulare e scalabile', 'Ruoli, permessi e multi-tenancy', 'Integrazioni API di terze parti', 'Automazioni e reportistica', 'Supporto e manutenzione inclusi'] },
      { title: 'Soluzione Enterprise', priceLabel: 'Da €15.000', period: '', premium: true, description: 'Progetti mission-critical, alta disponibilità', delivery: 'Su misura per te', features: ['Infrastruttura cloud multi-region', 'DevOps, CI/CD e monitoraggio 24/7', 'API pubbliche e documentazione', 'GDPR, audit e compliance', 'SLA garantito e team dedicato'] },
    ],
  },
  {
    label: 'Video Making',
    subtitle: 'Produzione, montaggio e motion graphics.',
    tiers: [
      { title: 'Video Essenziale', price: '600', period: '', description: 'Montaggio base, clip per social e reel', delivery: 'Consegna in 3-5 giorni', features: ['Montaggio professionale', 'Color correction base', 'Audio mixing essenziale', 'Export ottimizzato per social', '2 revisioni incluse'] },
      { title: 'Produzione Completa', price: '2.200', period: '', popular: true, description: 'Video aziendali, spot, contenuti brand', delivery: 'Consegna in 1-2 settimane', features: ['Riprese in studio o in location', 'Motion graphics e VFX', 'Color grading avanzato', 'Sound design e colonna sonora', 'Revisioni illimitate fino a ok finale'] },
      { title: 'Spot Pubblicitario', price: '4.500', period: '', premium: true, description: 'Campagne adv, TV, cinema e digitale', delivery: 'Su misura per te', features: ['Concept creativo e script', 'Location scouting e casting', 'Riprese multi-camera 4K/6K', 'Post-produzione broadcast', 'Adattamento multi-formato (TV, social, DOOH)'] },
    ],
  },
];

const PRICING_MONTHLY: PricingCategory[] = [
  {
    label: 'Design',
    subtitle: 'Brand identity, grafica social, UI/UX e comunicazione continuativa.',
    tiers: [
      { title: 'Social Care', price: '350', period: '/mese', description: 'Contenuti social e grafiche ricorrenti', delivery: 'Attivazione immediata', features: ['8 post social o thumbnail al mese', 'Grafiche per social e marketing', 'Revisioni illimitate fino a ok', 'Formati multi-piattaforma', 'Report engagement mensile'] },
      { title: 'Brand Growth', price: '750', period: '/mese', popular: true, description: 'Gestione continuativa brand e comunicazione visiva', delivery: 'Attivazione immediata', features: ['15 asset grafici al mese (post, flyer, locandine)', 'Strategia editoriale visuale', 'Cover art e thumbnail YouTube', 'Materiali marketing e print', 'Priority support e iterazioni rapide'] },
      { title: 'Design Partnership', price: '1.200', period: '/mese', premium: true, description: 'Partner creativo embedded nel brand', delivery: 'Inizio immediato', hours: 'Fino a 25h/settimana, flessibili', features: ['Brand strategy continuativa', 'Grafiche per social, print, video e web', 'UI/UX design e prototipazione', 'Workshop creativi e report strategico'] },
    ],
  },
  {
    label: 'Sviluppo Web',
    subtitle: 'Manutenzione e crescita della tua presenza web.',
    tiers: [
      { title: 'Website Care', price: '350', period: '/mese', description: 'Manutenzione e aggiornamenti continui', delivery: 'Attivazione immediata', features: ['Aggiornamenti contenuti illimitati', 'Ottimizzazione performance mensile', 'Backup e sicurezza', '1 revisione design al mese', 'Report mensile'] },
      { title: 'Web Growth', price: '900', period: '/mese', popular: true, description: 'Sviluppo iterativo e miglioramento continuo', delivery: 'Attivazione immediata', features: ['Nuove feature ogni sprint', 'A/B testing e analytics', 'SEO continuativo', 'Iterazioni settimanali', 'Priority support'] },
      { title: 'Web Partnership', price: '1.500', period: '/mese', premium: true, description: 'Partner web embedded nel team', delivery: 'Inizio immediato', hours: 'Fino a 40h/settimana, flessibili', features: ['Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale'] },
    ],
  },
  {
    label: 'Software & App',
    subtitle: 'Team esterno dedicato, mese per mese.',
    tiers: [
      { title: 'Dev Part-Time', price: '1.500', period: '/mese', description: 'Sviluppo dedicato su base mensile', delivery: 'Attivazione in 24-48h', hours: 'Fino a 10h/settimana, flessibili', features: ['Code review e documentazione', 'Deploy e CI/CD gestiti', 'Canale Slack dedicato', 'Sprint bisettimanali'] },
      { title: 'Dev Full-Time', price: '3.500', period: '/mese', popular: true, description: 'Risorse scalabili per progetti complessi', delivery: 'Attivazione in 24-48h', hours: 'Fino a 25h/settimana, flessibili', features: ['Tech lead e architettura inclusi', 'Gestione progetto Agile', 'On-call per emergenze', 'Reportistica avanzata'] },
      { title: 'Tech Partnership', price: '5.500', period: '/mese', premium: true, description: 'Sviluppatore senior embedded nel tuo team', delivery: 'Inizio immediato', hours: 'Fino a 40h/settimana, flessibili', features: ['Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale'] },
    ],
  },
  {
    label: 'Video Making',
    subtitle: 'Contenuti video costanti per social e brand.',
    tiers: [
      { title: 'Social Pack', price: '450', period: '/mese', description: 'Pacchetto mensile reel e short', delivery: 'Attivazione immediata', features: ['4 reel/short al mese', 'Motion graphics inclusa', 'Strategia editoriale', 'Adattamento multi-piattaforma', '2 revisioni a video'] },
      { title: 'Content Studio', price: '1.500', period: '/mese', popular: true, description: 'Produzione video continuativa', delivery: 'Attivazione immediata', features: ['4 video professionali al mese', 'Riprese in sede o remote', 'Post-produzione completa', 'Stock footage illimitato', 'Brand kit video dedicato'] },
      { title: 'Brand Studio', price: '2.500', period: '/mese', premium: true, description: 'Partner video embedded nel tuo brand', delivery: 'Inizio immediato', features: ['6 video professionali al mese', 'Motion graphics e VFX inclusi', 'Strategia editoriale mensile', 'Report analytics performance', 'Accesso a footage library esclusiva'] },
    ],
  },
];

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

export default function HomeShell() {
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formService, setFormService] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isMonthly, setIsMonthly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('Tutti');
  const [tooltipInfo, setTooltipInfo] = useState<{ text: string; el: HTMLElement; hiding?: boolean } | null>(null);
  const hideTooltipTimerRef = useRef<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true); // TODO: connect to real online status API
  const [messages, setMessages] = useState<{ id: number; text: string; sender: 'client' | 'tia' }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1);
  const sessionIdRef = useRef(`sess_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`);
  const lastPollRef = useRef(Date.now());
  // ── Standalone chatbot state (for the #chatbot section) ──
  const [botInput, setBotInput] = useState('');
  const [botMessages, setBotMessages] = useState<{ id: number; text: string; sender: 'user' | 'bot' }[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const botNextIdRef = useRef(1);
  const botMessagesRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (botMessagesRef.current) {
      botMessagesRef.current.scrollTop = botMessagesRef.current.scrollHeight;
    }
  }, [botMessages, botTyping]);

  const sendBotMessage = () => {
    const text = botInput.trim();
    if (!text) return;
    const uid = botNextIdRef.current++;
    setBotMessages(prev => [...prev, { id: uid, text, sender: 'user' }]);
    setBotInput('');
    setBotTyping(true);

    const replyId = botNextIdRef.current++;
    setBotMessages(prev => [...prev, { id: replyId, text: '', sender: 'bot' }]);

    const msgs = [...botMessages.map(m => ({
      role: m.sender === 'bot' ? 'assistant' as const : 'user' as const,
      content: m.text,
    })), { role: 'user' as const, content: text }];    fetch('/api/chat/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => '');
        // Try to extract error from SSE body, fallback to generic message
        let errMsg = 'Errore del server. Controlla le API key in .env o contatta Tia su WhatsApp.';
        try {
          const sseMatch = body.match(/data: (\{.*?\})/);
          if (sseMatch) {
            const parsed = JSON.parse(sseMatch[1]);
            if (parsed?.error) errMsg = parsed.error;
          }
        } catch { /* ignore */ }
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
              // Check for error payload
              if (parsed?.error) {
                full = parsed.error;
              }
              continue;
            }
            // Play notification on the very first token
            if (!full) playNotificationSound();
            full += token;
            setBotMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: full } : m));
          } catch { /* skip */ }
        }
      }

      // If stream produced no content, show fallback error
      if (!full) {
        full = 'Non ho ricevuto risposta. Verifica le API key in .env o contatta Tia su WhatsApp.';
      }
      setBotMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: full } : m));
      setBotTyping(false);
    }).catch(() => {
      setBotMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: 'Errore di connessione. Riprova.' } : m));
      setBotTyping(false);
    });
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

    // Close any existing connection before opening a new one
    eventSourceRef.current?.close();

    const es = new EventSource(`/api/chat/stream?sessionId=${sessionIdRef.current}&since=${lastPollRef.current}`);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      // Connection established — no action needed
    });

    es.onmessage = (e) => {
      try {
        const messages = JSON.parse(e.data);
        if (!Array.isArray(messages) || messages.length === 0) return;
        lastPollRef.current = Date.now();
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = messages.filter((m: any) => !existingIds.has(m.id));
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

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [chatOpen]);

  // ── Analytics helper (fire-and-forget) ──
  const logAnalytics = (event: string, text?: string) => {
    fetch('/api/analytics/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionIdRef.current, event, text }),
    }).catch(() => {});
  };

  const sendMessage = () => {
    const text = chatMessage.trim();
    if (!text) return;
    const id = nextIdRef.current++;
    setMessages(prev => [...prev, { id, text, sender: 'client' }]);
    setChatMessage('');
    lastPollRef.current = Date.now();

    // Log analytics
    logAnalytics('message_sent', text);

    // Forward to Telegram via backend (includes sessionId for reply routing + IP geo)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId: sessionIdRef.current }),
    }).then(() => {
      // Show automatic confirmation only once per session
      const autoReplyId = nextIdRef.current++;
      setMessages(prev => {
        const alreadyAutoReplied = prev.some(m => m.sender === 'tia' && m.text.includes('Risponderò'));
        if (alreadyAutoReplied) return prev;
        return [...prev, { id: autoReplyId, text: 'Grazie per avermi scritto! Ti risponderò a breve 💬', sender: 'tia' }];
      });
    }).catch(() => { });
  };

  const pricing = isMonthly ? PRICING_MONTHLY : PRICING_ONETIME;
  const heroRef = useRef<HTMLDivElement>(null);

  // Hero entrance animation on page load
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-anim', {
        opacity: 0,
        y: 40,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.3,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

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
    setFormStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, message: formMessage, service: formService }),
      });
      if (res.ok) {
        setFormStatus('sent');
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
      <Navbar />

      <div className="bg-[#010101] text-neutral-200 font-sans">
        {/* ============ HERO ============ */}
        <section ref={heroRef} className="relative h-screen w-full overflow-hidden flex items-center bg-[#010101]">
          <Dither
            waveColor={[0.298, 0.608, 0.510]}
            waveSpeed={0.06}
            waveFrequency={8.4}
            waveAmplitude={0.3}
            colorNum={12.9}
            pixelSize={2}
            enableMouseInteraction={true}
            mouseRadius={0.1}
          />

          <div className="absolute inset-0 bg-black/20 z-[4] pointer-events-none" />

          <div className="relative z-20 text-left px-6 sm:px-12 md:px-20 lg:px-28 max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-[90rem] pointer-events-none">
            <p className="hero-anim text-teal-400/80 text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase mb-4 sm:mb-6 font-semibold">
              Designer • Sviluppatore • Videomaker
            </p>
            <h1 className="hero-anim text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05]">
              Il perfetto equilibrio<br />
              <span className="font-bold text-teal-400 whitespace-nowrap">tra estetica e ingegneria.</span>
            </h1>
            <p className="hero-anim mt-6 sm:mt-8 text-white text-sm sm:text-base md:text-lg max-w-md sm:max-w-xl font-medium leading-relaxed relative">
              <span className="absolute inset-0 blur-3xl opacity-60 bg-teal-400/20 rounded-full scale-150 -z-10 pointer-events-none" />
              Progetto e sviluppo app, software, siti web e produzioni video.
              Design, codice e immagine in un unico professionista.
            </p>
            <div className="hero-anim mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-5 justify-start items-start sm:items-center">
              <button
                onClick={() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-7 sm:px-9 py-3.5 sm:py-4 bg-teal-500 text-white rounded-full text-[15px] font-semibold hover:bg-teal-400 transition-all shadow-xl shadow-teal-500/25 pointer-events-auto tracking-wide inline-flex items-center gap-2.5"
              >
                <TiaIcon icon={FilePenIcon} size={18} strokeWidth={2} />
                Richiedi preventivo
              </button>
              <button
                onClick={() => document.getElementById('prezzi')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-7 sm:px-9 py-3.5 sm:py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full text-[15px] font-semibold hover:bg-white/20 hover:border-white/50 transition-all shadow-lg shadow-black/20 pointer-events-auto tracking-wide inline-flex items-center gap-2.5"
              >
                <TiaIcon icon={DollarSignIcon} size={18} strokeWidth={2} />
                Vedi i prezzi
              </button>
              <button
                onClick={() => document.getElementById('progetti')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-2 sm:px-3 py-3.5 sm:py-4 text-white/80 hover:text-white rounded-full text-[15px] font-medium transition-all inline-flex items-center gap-2 group pointer-events-auto tracking-wide"
              >
                Vedi i lavori
                <TiaIcon icon={ArrowRight01Icon} size={20} className="transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce">
            <svg aria-hidden="true" className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* ── Glass Bento Stats Card — bottom right ── */}
          <div className="hidden lg:block absolute bottom-16 right-10 sm:right-16 md:right-20 z-20 pointer-events-none">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-2xl shadow-black/40">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-white text-lg font-bold leading-none">15<span className="text-teal-400">+</span></p>
                    <p className="text-neutral-400 text-[11px] tracking-wide">Clienti soddisfatti</p>
                  </div>
                </div>
                <div className="w-full h-px bg-white/[0.06]" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-white text-lg font-bold leading-none"><span className="text-teal-400">&lt;</span>1h</p>
                    <p className="text-neutral-400 text-[11px] tracking-wide">Tempo di risposta</p>
                  </div>
                </div>
                <div className="w-full h-px bg-white/[0.06]" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <div>
                    <p className="text-white text-lg font-bold leading-none"><span className="text-teal-400">30</span>/30/40</p>
                    <p className="text-neutral-400 text-[11px] tracking-wide">Metodo di pagamento</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SERVIZI ============ */}
        <section id="servizi" className="py-24 px-4 bg-[#010101]">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-16">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Cosa offro</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Servizi</h2>
              <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                Quattro aree: design visivo, siti web, software/app e produzione video. Per ogni esigenza digitale.
              </p>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-[54em] mx-auto px-3 relative">
              {/* ═══ DESIGN CARDS ═══ */}
              {/* Card 1 — Brand Identity & Logo */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={WebDesign01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Design</span></div>
                  <div>
                    <h3 className="text-white text-base font-medium mb-1">Brand & Logo</h3>
                    <p className="text-neutral-500 text-xs leading-relaxed">Marchi, logotipi, palette, tipografia e identità visiva completa.</p>
                  </div>
                </div>
              </BorderGlow>

              {/* Card 2 — Graphic Design */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={ColorsIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Design</span></div>
                  <div>
                    <h3 className="text-white text-base font-medium mb-1">Grafica & Social</h3>
                    <p className="text-neutral-500 text-xs leading-relaxed">Post social, thumbnail YouTube, grafiche streamer, locandine, flyer, poster e materiali marketing.</p>
                  </div>
                </div>
              </BorderGlow>

              {/* Card 3 — UI/UX Design (large) */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="lg:col-span-2 lg:row-span-2 min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] lg:min-h-[420px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={PaintBoardIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Design</span></div>
                  <div>
                    <h3 className="text-white text-lg sm:text-xl font-medium mb-2">UI/UX Design</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed">Interfacce web e app, wireframe interattivi, prototipazione avanzata e design system scalabili.</p>
                  </div>
                </div>
              </BorderGlow>

              {/* ═══ WEB DEV CARD ═══ */}
              {/* Card 4 — Sviluppo Web (large) */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="lg:col-span-2 lg:row-span-2 lg:[grid-row:2_/_span_2] lg:[grid-column:1_/_span_2] min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] lg:min-h-[420px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={CodeIcon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Web Dev</span></div>
                  <div>
                    <h3 className="text-white text-lg sm:text-xl font-medium mb-2">Sviluppo Web</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed">Siti web, dashboard, e-commerce e applicazioni frontend/backend con Next.js, React e Vue.js.</p>
                  </div>
                </div>
              </BorderGlow>

              {/* ═══ SOFTWARE CARD ═══ */}
              {/* Card 5 — Software & App (large) */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="lg:col-span-2 min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full min-h-[200px] lg:min-h-[200px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={MobileProgramming01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Software</span></div>
                  <div>
                    <h3 className="text-white text-lg sm:text-xl font-medium mb-2">Software & App</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed">App mobile, software su misura, API, database, architetture cloud e automazioni.</p>
                  </div>
                </div>
              </BorderGlow>

              {/* ═══ VIDEO CARDS ═══ */}
              {/* Card 6 — Video Content */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="lg:col-span-2 min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={Video01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Video</span></div>
                  <div>
                    <h3 className="text-white text-base font-medium mb-1">Contenuti Video</h3>
                    <p className="text-neutral-500 text-xs leading-relaxed">Reel, short, contenuti social e riprese leggere ottimizzati per ogni piattaforma.</p>
                  </div>
                </div>
              </BorderGlow>

              {/* Card 7 — Post-Production */}
              <BorderGlow continuousHover borderRadius={20} glowRadius={30} glowIntensity={2.2} edgeSensitivity={0} className="lg:col-span-2 min-h-[200px] group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-[20px]">
                  <DotGrid dotSize={3} gap={14} baseColor="#0a0a0a" activeColor="#10B981" proximity={100} shockRadius={200} shockStrength={4} resistance={700} returnDuration={1.2} />
                </div>
                <div className="p-5 flex flex-col justify-between h-full min-h-[200px] relative z-10">
                  <div className="flex items-center gap-2"><TiaIcon icon={Motion01Icon} size={18} className="text-teal-400" /><span className="text-teal-400 text-sm">Video</span></div>
                  <div>
                    <h3 className="text-white text-base font-medium mb-1">Post-Produzione</h3>
                    <p className="text-neutral-500 text-xs leading-relaxed">Montaggio avanzato, color grading, motion graphics e VFX per produzioni professionali.</p>
                  </div>
                </div>
              </BorderGlow>
            </div>
          </div>
        </section>

        {/* ============ PREZZI ============ */}
        <section id="prezzi" className="py-24 px-4 bg-[#050505]">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-12">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Tariffe trasparenti</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Prezzi</h2>
              <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                Ogni progetto ha un preventivo dedicato. Qui trovi una stima indicativa per orientarti.
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
                  Una tantum
                </button>
                <button
                  onClick={() => setIsMonthly(true)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${isMonthly ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-neutral-400 hover:text-white'
                    }`}
                >
                  Collaborazione
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

                    {/* ── Tooltip position follows scroll ── */}
          {tooltipInfo && typeof document !== 'undefined' && typeof window !== 'undefined' && createPortal(
            <TooltipContent text={tooltipInfo.text} el={tooltipInfo.el} hiding={tooltipInfo.hiding} />,
            document.body
          )}

        {/* ============ PROGETTI ============ */}
        <section id="progetti" className="py-24 px-4 bg-[#050505]">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-16">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Portfolio</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Progetti recenti</h2>
              <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                Una selezione dei miei lavori più recenti.
              </p>
            </ScrollReveal>

            {/* ── Filter Buttons ── */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-12 flex-wrap">
              {['Tutti', 'Design', 'Sviluppo', 'Video'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${activeFilter === f
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROJECTS.filter(p => activeFilter === 'Tutti' || p.category === activeFilter).map((project) => (
                <BorderGlow key={project.id} continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="group">
                  <div className="bg-[#0a0a0a] overflow-hidden rounded-[20px]">
                    <div className="relative aspect-video w-full bg-[#0a0a0a] p-3">
                      <div className="w-full h-full overflow-hidden rounded-xl">
                        <picture>
                          {project.thumbnail.startsWith('/uploads/') && (
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
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10 text-white hover:bg-white/5 inline-flex items-center justify-center gap-2"
                        >
                          {project.isVideo ? 'Guarda il video' : 'Visita progetto'}
                          <TiaIcon icon={project.isVideo ? PlayIcon : ExternalLinkIcon} size={16} strokeWidth={2} />
                        </a>
                        <button
                          onClick={() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' })}
                          className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium transition-all bg-teal-600 text-white hover:bg-teal-500"
                        >
                          Preventivo
                        </button>
                      </div>
                    </div>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CHI SONO ============ */}
        <section id="chisono" className="py-24 px-4 bg-[#010101] overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-16">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Chi sono</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Tia Chinaglia</h2>
              <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                Costruisco ecosistemi digitali completi, unendo architetture software solide a flussi di lavoro iper-automatizzati tramite AI, LLM, n8n e Claude Code. Complemento lo sviluppo con un'esperienza IT hands-on e competenze avanzate in UI/UX e produzione visiva.
              </p>
            </ScrollReveal>

            {/* ── Horizontal skill rows ── */}
            <div className="flex flex-col gap-8">
              {[
                {
                  id: 'design',
                  speed: '50s',
                  direction: 'left' as const,
                  title: 'Design',
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
                  direction: 'right' as const,
                  title: 'Sviluppo Web',
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
                  direction: 'left' as const,
                  title: 'Linguaggi & Backend',
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
                  direction: 'right' as const,
                  title: 'AI & Automazione',
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
                  direction: 'left' as const,
                  title: 'Produzione Visiva',
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
                  direction: 'right' as const,
                  title: 'IT & Hardware',
                  skills: [
                    { name: 'Assemblaggio Hardware', Icon: CpuIcon },
                    { name: 'Riparazioni PC', Icon: RepairIcon },
                    { name: 'Git / GitHub', Icon: Github01Icon },
                    { name: 'Docker', Icon: ContainerIcon },
                    { name: 'Linux / Terminale', Icon: TerminalIcon },
                    { name: 'Blender', Icon: BlenderIcon },
                  ],
                },
              ].map((row) => (
                <div key={row.id} className="w-full overflow-hidden relative">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-white text-sm font-semibold">{row.title}</span>
                  </div>
                  <div className="relative">
                    {/* Fade edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none bg-gradient-to-r from-[#010101] to-transparent" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none bg-gradient-to-r from-transparent to-[#010101]" />
                    <div
                      className={`flex ${row.direction === 'right' ? 'animate-scroll-horizontal-reverse' : 'animate-scroll-horizontal'} hover:[animation-play-state:paused]`}
                      style={{ '--scroll-duration': row.speed } as React.CSSProperties}
                    >
                      {[0, 1].map((dup) => (
                        <div key={dup} className="flex items-stretch justify-center flex-shrink-0 gap-3 px-2 py-2" aria-hidden={dup === 1 ? true : undefined}>
                          {row.skills.map((skill) => (
                            <div
                              key={skill.name}
                              className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 flex-shrink-0 hover:border-teal-500/30 hover:bg-[#0f0f0f] transition-all duration-300 group cursor-default"
                            >
                              <TiaIcon icon={skill.Icon} size={18} className="text-teal-400" />
                              <span className="text-neutral-300 text-sm font-medium whitespace-nowrap group-hover:text-white transition-colors">{skill.name}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CHATBOT ============ */}
        <section id="chatbot" className="py-24 px-4 bg-[#010101]">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal className="text-center mb-16" start="top 85%" end="bottom 25%">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Preventivo</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Calcola il tuo progetto</h2>
              <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                Descrivi il tuo progetto e riceverai un preventivo via email in poche ore.
              </p>
            </ScrollReveal>
            <BorderGlow
              continuousHover
              borderRadius={24}
              glowRadius={45}
              glowIntensity={2.6}
              edgeSensitivity={0}
              className="[&_.border-glow-inner]:!overflow-visible"
            >
              <div className="p-4 sm:p-6 md:p-8 relative" style={{ maxHeight: '70vh' }}>
                {/* Tia Designs animated logo badge — top right */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity duration-300 select-none">
                  <svg className="w-4 h-4 text-teal-400 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" opacity="0.9"/>
                    <path d="M12 6L13.5 9.5L17 10L14.5 12.5L15 16L12 14L9 16L9.5 12.5L7 10L10.5 9.5L12 6Z" fill="currentColor" opacity="0.5"/>
                  </svg>
                  <span className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase">Tia</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500/40 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                {/* Chat messages */}
                <div ref={botMessagesRef} className="flex flex-col gap-4 min-h-[320px] max-h-[50vh] overflow-y-auto pr-1 mb-4 scroll-smooth">
                  {botMessages.length === 0 && !botTyping && (
                    <div className="flex-1 flex items-center justify-center min-h-[280px]">
                      <div className="text-center select-none">
                        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
                          <TiaIcon icon={BubbleChatIcon} size={30} className="text-teal-400" />
                        </div>
                        <h4 className="text-white text-xl font-semibold mb-2">Parlami del tuo progetto</h4>
                        <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
                          Raccontami cosa hai in mente. Un sito web, un\'app, un video o un brand.
                          Ti darò un\'idea dei costi e dei tempi prima di parlare.
                        </p>
                      </div>
                    </div>
                  )}

                  {botMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-1">
                          <TiaIcon icon={BubbleChatIcon} size={16} className="text-teal-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
                            : 'bg-white/[0.04] text-neutral-200 rounded-2xl rounded-bl-sm'
                        }`}
                      >
                        {msg.text || (
                          <span className="flex gap-1.5 py-1">
                            <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-9 h-9 rounded-full bg-teal-600/30 flex items-center justify-center shrink-0 mt-1">
                          <TiaIcon icon={UserIcon} size={16} className="text-teal-300" />
                        </div>
                      )}
                    </div>
                  ))}



                </div>

                {/* Input */}
                <div className="flex items-end gap-2">
                  <textarea
                    value={botInput}
                    onChange={(e) => setBotInput(e.target.value)}
                    placeholder="Descrivi il tuo progetto…"
                    rows={2}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/30 resize-none placeholder-neutral-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendBotMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendBotMessage}
                    disabled={!botInput.trim()}
                    className="h-[42px] w-[42px] rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 hover:bg-teal-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Invia messaggio"
                  >
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </BorderGlow>
          </div>
        </section>

        {/* ============ RECENSIONI ============ */}
        <section id="recensioni" className="py-24 px-4 bg-[#050505]">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-16">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Testimonianze</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Cosa dicono i clienti</h2>
            </ScrollReveal>

            {/* ── Two-column opposing vertical scrollers ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative h-[540px] overflow-hidden py-5">
              {/* Fade top & bottom */}
              <div className="absolute top-0 left-0 right-0 h-16 z-20 pointer-events-none bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-16 z-20 pointer-events-none bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />

              {/* ── Left column — scrolls up ── */}
              <div className="overflow-hidden py-5 -my-5">
                <div className="animate-scroll-vertical hover:[animation-play-state:paused] flex flex-col gap-4" style={{ '--scroll-duration': '45s' } as React.CSSProperties}>
                  {[...REVIEWS.slice(0, 3), ...REVIEWS.slice(0, 3)].map((review, idx) => (
                    <BorderGlow key={`left-${idx}`} continuousHover borderRadius={20} glowRadius={25} glowIntensity={2.0} edgeSensitivity={0} className="w-full">
                      <div className="p-5 sm:p-6">
                        <div className="flex gap-1 mb-3">
                          {Array.from({ length: review.stars }).map((_, i) => (
                            <svg key={i} aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-neutral-300 text-sm leading-relaxed mb-3 italic">&ldquo;{review.text}&rdquo;</p>
                        <p className="text-white font-medium text-sm">{review.name}</p>
                        <p className="text-neutral-500 text-xs">{review.role}</p>
                      </div>
                    </BorderGlow>
                  ))}
                </div>
              </div>

              {/* ── Right column — scrolls down ── */}
              <div className="overflow-hidden hidden md:block py-5 -my-5">
                <div className="animate-scroll-vertical-reverse hover:[animation-play-state:paused] flex flex-col gap-4" style={{ '--scroll-duration': '40s' } as React.CSSProperties}>
                  {[...REVIEWS.slice(3, 6), ...REVIEWS.slice(3, 6)].map((review, idx) => (
                    <BorderGlow key={`right-${idx}`} continuousHover borderRadius={20} glowRadius={25} glowIntensity={2.0} edgeSensitivity={0} className="w-full">
                      <div className="p-5 sm:p-6">
                        <div className="flex gap-1 mb-3">
                          {Array.from({ length: review.stars }).map((_, i) => (
                            <svg key={i} aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-neutral-300 text-sm leading-relaxed mb-3 italic">&ldquo;{review.text}&rdquo;</p>
                        <p className="text-white font-medium text-sm">{review.name}</p>
                        <p className="text-neutral-500 text-xs">{review.role}</p>
                      </div>
                    </BorderGlow>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <FaqScroller
          mainTitle="Domande frequenti"
          mainSubtitle="Hai dei dubbi? Qui trovi le risposte alle domande più comuni. Se non trovi ciò che cerchi, scrivimi."
          rows={[
            {
              id: 'row1',
              speed: '55s',
              direction: 'left',
              faqItems: FAQS.slice(0, 3).map((faq, i) => ({ id: `faq-row1-${i}`, question: faq.q, answer: faq.a })),
            },
            {
              id: 'row2',
              speed: '48s',
              direction: 'right',
              faqItems: FAQS.slice(3, 6).map((faq, i) => ({ id: `faq-row2-${i}`, question: faq.q, answer: faq.a })),
            },
            {
              id: 'row3',
              speed: '62s',
              direction: 'left',
              faqItems: FAQS.slice(6, 10).map((faq, i) => ({ id: `faq-row3-${i}`, question: faq.q, answer: faq.a })),
            },
          ]}
        />

        {/* ============ CONTATTI ============ */}
        <section id="contatti" className="py-24 px-4 bg-[#050505]">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal className="text-center mb-16" start="top 85%" end="bottom 25%">
              <p className="text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">Parliamone</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Contatti</h2>
              <p className="text-neutral-400 mt-4 max-w-lg mx-auto text-base leading-relaxed">
                Raccontami il tuo progetto. Ti risponderò entro 24 ore.
              </p>
            </ScrollReveal>

            {/* ── Two-column layout: form left, info right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* ── Form column (spans 2) ── */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                {/* Nome + Email + Servizio row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0}>
                    <div className="p-5">
                      <label htmlFor="form-name" className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">Nome *</label>
                      <input id="form-name" type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-neutral-600"
                        placeholder="Il tuo nome" />
                    </div>
                  </BorderGlow>
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0}>
                    <div className="p-5">
                      <label htmlFor="form-email" className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">Email *</label>
                      <input id="form-email" type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-neutral-600"
                        placeholder="tua@email.com" />
                    </div>
                  </BorderGlow>
                  <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="[&_.border-glow-inner]:!overflow-visible relative z-[55]">
                    <ServiceSelect value={formService} onChange={setFormService} />
                  </BorderGlow>
                </div>
                {/* Messaggio — taller */}
                <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0}>
                  <div className="p-5">
                    <label htmlFor="form-message" className="block text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2">Messaggio *</label>
                    <textarea id="form-message" required value={formMessage} onChange={(e) => setFormMessage(e.target.value)} rows={8}
                      className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-neutral-600 resize-none min-h-[140px]"
                      placeholder="Descrivi il tuo progetto..." />
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
                  {formStatus === 'sending' ? <><TiaIcon icon={LoaderPinwheelIcon} size={18} className="animate-spin" strokeWidth={2} /> Invio...</> : formStatus === 'sent' ? <><TiaIcon icon={CheckmarkCircle01Icon} size={18} className="animate-pulse" strokeWidth={2} /> Inviato!</> : formStatus === 'error' ? <><TiaIcon icon={AlertCircleIcon} size={18} className="animate-bounce" strokeWidth={2} /> Errore — Riprova</> : <><TiaIcon icon={Mail01Icon} size={18} strokeWidth={2} /> Invia messaggio</>}</button>
              </div>

              {/* ── Info sidebar — email, telefono, whatsapp + dettagli ── */}
              <div className="flex flex-col gap-2 h-full">
                <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="flex-1">
                  <a
                    href="mailto:tiachinaglia@gmail.com"
                    {...getSectionHandlers('Scrivimi direttamente via email. Rispondo entro 24 ore.')}
                    className="flex items-center gap-2.5 p-3 group h-full"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-all">
                      <TiaIcon icon={Mail01Icon} size={15} className="text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-[11px] font-medium truncate">tiachinaglia@gmail.com</p>
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
                      <p className="text-neutral-500 text-[10px]">Telefono</p>
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
                      <p className="text-neutral-500 text-[10px]">Messaggio veloce</p>
                    </div>
                  </a>
                </BorderGlow>
                <BorderGlow continuousHover borderRadius={20} glowRadius={28} glowIntensity={2.0} edgeSensitivity={0} className="flex-1">
                  <div className="p-3 space-y-2 h-full flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <TiaIcon icon={Location01Icon} size={11} className="text-teal-400 shrink-0" strokeWidth={2} />
                      <span>Mantova, Italia</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <TiaIcon icon={Clock01Icon} size={11} className="text-teal-400 shrink-0" strokeWidth={2} />
                      <span>Risposta entro 24h</span>
                    </div>
                  </div>
                </BorderGlow>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <FooterAnimation />

        <GradualBlur />
      </div>
      {/* ── Floating Chat Widget ── */}
      <div ref={chatWidgetRef} className="fixed bottom-6 right-6 z-50 pointer-events-auto">
        {/* Chat popup */}
        {chatOpen && (
          <div role="dialog" aria-modal="true" aria-label="Chat con Tia Chinaglia" className={`absolute bottom-20 right-0 w-[340px] sm:w-[380px] max-h-[50vh] bg-[#0f0f0f] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col transition-all duration-300 ${chatOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <TiaIcon icon={BubbleChatIcon} size={20} className="text-teal-400" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0f0f0f] transition-colors duration-500 ${isOnline ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]' : 'bg-neutral-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">Tia Chinaglia</p>
                <p className={`text-xs flex items-center gap-1.5 ${isOnline ? 'text-teal-400' : 'text-neutral-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-teal-400 animate-pulse' : 'bg-neutral-500'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.05] flex items-center justify-center transition-colors text-neutral-500 hover:text-white"
                aria-label="Chiudi chat"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Messages area */}
            <div ref={chatMessagesRef} className="flex-1 px-5 py-4 min-h-0 overflow-y-auto flex flex-col gap-3">
              {messages.length === 0 && !isTyping && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center select-none">
                    <div className="text-neutral-600/40 text-6xl font-bold leading-none tracking-tight mb-2">
                      Ciao!
                    </div>
                    <p className="text-neutral-600/30 text-sm max-w-[200px] mx-auto leading-relaxed">
                      Sono Tia Chinaglia. Raccontami cosa hai in mente.
                    </p>
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
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Scrivi un messaggio..."
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
        )}

        {/* Floating button with online dot */}
        <button
          onClick={() => {
            const next = !chatOpen;
            setChatOpen(next);
            if (next) logAnalytics('chat_open');
          }}
          className={`relative p-4 text-white rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${chatOpen ? 'bg-[#0f0f0f] scale-90' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-500/30'
            }`}
          aria-label={chatOpen ? 'Chiudi chat' : 'Apri chat'}
        >
          {chatOpen ? (
            <TiaIcon icon={Cancel01Icon} size={24} strokeWidth={2} />
          ) : (
            <TiaIcon icon={BubbleChatIcon} size={24} />
          )}
          {/* Online dot */}
          <span className={`absolute top-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#010101] transition-all duration-500 ${chatOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'} ${isOnline ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)] animate-pulse' : 'bg-neutral-500'}`} />
        </button>
      </div>
    </SmoothScrollProvider>
  );
}
