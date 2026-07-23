'use client';

import React, { useState, useMemo } from 'react';
import TiaIcon from './TiaIcon';
import {
  FigmaIcon,
  AdobePhotoshopIcon,
  AdobeIllustratorIcon,
  WebDesign01Icon,
  LayersIcon,
  LayoutGridIcon,
  PaintBoardIcon,
  ColorsIcon,
  ReactIcon,
  CodeFolderIcon,
  Typescript01Icon,
  JavaScriptIcon,
  ThreeDViewIcon,
  TailwindcssIcon,
  CodeIcon,
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
  ArtificialIntelligence01Icon,
  ChatGptIcon,
  WorkflowCircle01Icon,
  ClaudeIcon,
  WorkflowSquare01Icon,
  Robot01Icon,
  AdobePremierIcon,
  AdobeAfterEffectIcon,
  FilmRoll01Icon,
  Scissor01Icon,
  Motion01Icon,
  Video01Icon,
  PlayIcon,
  CpuIcon,
  RepairIcon,
  Github01Icon,
  BlenderIcon,
  Mail01Icon,
  CallIcon,
  WhatsappIcon,
  BubbleChatIcon,
  UserIcon,
  Location01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  LoaderPinwheelIcon,
  FilePenIcon,
  DollarSignIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  ExternalLinkIcon,
} from './icons';

interface IconEntry {
  name: string;
  component: any;
}

interface IconCategory {
  category: string;
  icons: IconEntry[];
}

const ICON_CATEGORIES: IconCategory[] = [
  {
    category: 'Design',
    icons: [
      { name: 'FigmaIcon', component: FigmaIcon },
      { name: 'AdobePhotoshopIcon', component: AdobePhotoshopIcon },
      { name: 'AdobeIllustratorIcon', component: AdobeIllustratorIcon },
      { name: 'WebDesign01Icon', component: WebDesign01Icon },
      { name: 'LayersIcon', component: LayersIcon },
      { name: 'LayoutGridIcon', component: LayoutGridIcon },
      { name: 'PaintBoardIcon', component: PaintBoardIcon },
      { name: 'ColorsIcon', component: ColorsIcon },
    ],
  },
  {
    category: 'Sviluppo Web',
    icons: [
      { name: 'ReactIcon', component: ReactIcon },
      { name: 'CodeFolderIcon', component: CodeFolderIcon },
      { name: 'Typescript01Icon', component: Typescript01Icon },
      { name: 'JavaScriptIcon', component: JavaScriptIcon },
      { name: 'ThreeDViewIcon', component: ThreeDViewIcon },
      { name: 'TailwindcssIcon', component: TailwindcssIcon },
      { name: 'CodeIcon', component: CodeIcon },
    ],
  },
  {
    category: 'Software & Backend',
    icons: [
      { name: 'PythonIcon', component: PythonIcon },
      { name: 'CProgrammingIcon', component: CProgrammingIcon },
      { name: 'JavaIcon', component: JavaIcon },
      { name: 'PhpIcon', component: PhpIcon },
      { name: 'DiamondIcon', component: DiamondIcon },
      { name: 'MobileProgramming01Icon', component: MobileProgramming01Icon },
      { name: 'ServerStack01Icon', component: ServerStack01Icon },
      { name: 'Database01Icon', component: Database01Icon },
      { name: 'ContainerIcon', component: ContainerIcon },
      { name: 'TerminalIcon', component: TerminalIcon },
    ],
  },
  {
    category: 'AI & Automazione',
    icons: [
      { name: 'ArtificialIntelligence01Icon', component: ArtificialIntelligence01Icon },
      { name: 'ChatGptIcon', component: ChatGptIcon },
      { name: 'WorkflowCircle01Icon', component: WorkflowCircle01Icon },
      { name: 'ClaudeIcon', component: ClaudeIcon },
      { name: 'WorkflowSquare01Icon', component: WorkflowSquare01Icon },
      { name: 'Robot01Icon', component: Robot01Icon },
    ],
  },
  {
    category: 'Video Making',
    icons: [
      { name: 'AdobePremierIcon', component: AdobePremierIcon },
      { name: 'AdobeAfterEffectIcon', component: AdobeAfterEffectIcon },
      { name: 'FilmRoll01Icon', component: FilmRoll01Icon },
      { name: 'Scissor01Icon', component: Scissor01Icon },
      { name: 'Motion01Icon', component: Motion01Icon },
      { name: 'Video01Icon', component: Video01Icon },
      { name: 'PlayIcon', component: PlayIcon },
    ],
  },
  {
    category: 'Hardware & IT',
    icons: [
      { name: 'CpuIcon', component: CpuIcon },
      { name: 'RepairIcon', component: RepairIcon },
      { name: 'Github01Icon', component: Github01Icon },
      { name: 'BlenderIcon', component: BlenderIcon },
    ],
  },
  {
    category: 'Comunicazione & Contatti',
    icons: [
      { name: 'Mail01Icon', component: Mail01Icon },
      { name: 'CallIcon', component: CallIcon },
      { name: 'WhatsappIcon', component: WhatsappIcon },
      { name: 'BubbleChatIcon', component: BubbleChatIcon },
      { name: 'UserIcon', component: UserIcon },
      { name: 'Location01Icon', component: Location01Icon },
      { name: 'Clock01Icon', component: Clock01Icon },
    ],
  },
  {
    category: 'UI / Azioni',
    icons: [
      { name: 'CheckmarkCircle01Icon', component: CheckmarkCircle01Icon },
      { name: 'AlertCircleIcon', component: AlertCircleIcon },
      { name: 'LoaderPinwheelIcon', component: LoaderPinwheelIcon },
      { name: 'FilePenIcon', component: FilePenIcon },
      { name: 'DollarSignIcon', component: DollarSignIcon },
      { name: 'ArrowRight01Icon', component: ArrowRight01Icon },
      { name: 'Cancel01Icon', component: Cancel01Icon },
      { name: 'ExternalLinkIcon', component: ExternalLinkIcon },
    ],
  },
];

export default function IconsShowcase() {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_CATEGORIES;
    const q = search.toLowerCase();
    return ICON_CATEGORIES
      .map((cat) => ({
        ...cat,
        icons: cat.icons.filter((i) => i.name.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.icons.length > 0);
  }, [search]);

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(name).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  const totalIcons = ICON_CATEGORIES.reduce((acc, c) => acc + c.icons.length, 0);

  return (
    <div className="min-h-screen bg-[#010101] text-neutral-200 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Icone <span className="text-teal-400">disponibili</span>
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              {totalIcons} icone da <code className="text-teal-400/80 bg-teal-400/5 px-1.5 py-0.5 rounded text-xs">@hugeicons/core-free-icons</code>
            </p>
          </div>
          <a
            href="/"
            className="text-xs text-neutral-500 hover:text-teal-400 transition-colors uppercase tracking-widest font-medium"
          >
            ← Torna al sito
          </a>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca icona per nome…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500/40 focus:bg-white/[0.06] transition-all"
          />
          <svg
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              aria-label="Cancella ricerca"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-24 space-y-16">
        {filtered.map((cat) => (
          <section key={cat.category}>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">
                {cat.category}
              </h2>
              <span className="text-xs text-neutral-600 font-mono bg-white/[0.04] px-2 py-0.5 rounded-full">
                {cat.icons.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cat.icons.map((icon) => (
                <button
                  key={icon.name}
                  onClick={() => handleCopy(icon.name)}
                  className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] hover:border-teal-500/20 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-200"
                  title={`Click per copiare`}
                >
                  <div className={`transition-all duration-200 ${copied === icon.name ? 'scale-110 text-teal-400' : 'text-neutral-300 group-hover:text-teal-400'}`}>
                    <TiaIcon icon={icon.component} size={24} />
                  </div>
                  <span className={`text-[10px] text-center font-mono leading-tight transition-colors duration-200 ${
                    copied === icon.name ? 'text-teal-400' : 'text-neutral-500 group-hover:text-neutral-300'
                  }`}>
                    {copied === icon.name ? (
                      <span className="flex items-center gap-1">
                        <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copiato!
                      </span>
                    ) : (
                      icon.name.replace(/Icon$/, '')
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <svg aria-hidden="true" className="w-12 h-12 mb-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Nessuna icona trovata per <span className="text-teal-400/80 font-mono">&quot;{search}&quot;</span></p>
          </div>
        )}
      </div>

      {/* Floating count badge */}
      <div className="fixed bottom-6 left-6 z-50 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-full px-4 py-2 text-xs text-neutral-400 font-mono shadow-xl shadow-black/30">
        {copied ? (
          <span className="text-teal-400">Copiato! ✦</span>
        ) : (
          <span>{totalIcons} icone</span>
        )}
      </div>
    </div>
  );
}
