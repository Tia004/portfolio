'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BorderGlow from '@/app/components/BorderGlow';
import { StaticDitherTexture } from '@/app/components/DitherStatic';
import { ArrowLeft, Check, Copy, Download } from 'lucide-react';

const BRAND_COLORS = [
  { name: 'Teal Primary', hex: '#2dd4bf', rgb: 'rgb(45, 212, 191)', usage: 'Accenti, call to action, bordi luminescenti e link' },
  { name: 'Teal Deep', hex: '#0d281f', rgb: 'rgb(13, 40, 31)', usage: 'Sfondi delle card, superfici secondarie, toni scuri' },
  { name: 'Surface Black', hex: '#081410', rgb: 'rgb(8, 20, 16)', usage: 'Superficie liquid glass per card e modali' },
  { name: 'Pure Dark', hex: '#02040a', rgb: 'rgb(2, 4, 10)', usage: 'Sfondo principale del viewport e body' },
  { name: 'Bright White', hex: '#ffffff', rgb: 'rgb(255, 255, 255)', usage: 'Titoli principali H1/H2 e testi ad alto contrasto' },
  { name: 'Muted Neutral', hex: '#a3a3a3', rgb: 'rgb(163, 163, 163)', usage: 'Testi secondari, descrizioni e didascalie (WCAG AA)' },
];

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="tiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="#081410" stroke="#2dd4bf" stroke-width="2" stroke-opacity="0.3"/>
  <path d="M55 60 H145 M100 60 V145" stroke="url(#tiaGrad)" stroke-width="16" stroke-linecap="round"/>
</svg>`;

export default function BrandPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const copySvg = () => {
    navigator.clipboard.writeText(LOGO_SVG);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const downloadSvg = () => {
    const blob = new Blob([LOGO_SVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiadesigns-logo.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative min-h-screen bg-[#02040a] text-white px-5 sm:px-8 py-16 sm:py-24">
      {/* Background Dither */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-30 pointer-events-none">
        <StaticDitherTexture />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Navigation back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-teal-300 transition-colors mb-10 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Torna alla Home
        </Link>

        {/* Header */}
        <div className="mb-16">
          <p className="text-teal-400 text-xs font-mono font-bold uppercase tracking-[0.25em] mb-3">
            Brand Guidelines &amp; Assets
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            Identità Visiva Tia Designs
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            I principi di design, la palette cromatica, la tipografia e le risorse ufficiali che definiscono l'esperienza visiva di Tia Designs.
          </p>
        </div>

        {/* ── Sezione 1: Logo Ufficiale ── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            Logo &amp; Iconografia
          </h2>
          <BorderGlow continuousHover borderRadius={24} glowRadius={32} glowIntensity={2.0} edgeSensitivity={0}>
            <div className="p-6 sm:p-10 bg-[#081410]/80 backdrop-blur-xl rounded-[24px] border border-white/[0.1] flex flex-col sm:flex-row items-center gap-8">
              {/* Logo Preview */}
              <div className="w-40 h-40 shrink-0 p-4 rounded-3xl bg-black/60 border border-white/[0.1] flex items-center justify-center shadow-2xl">
                <div className="w-28 h-28" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
              </div>

              {/* Logo Actions & Details */}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Tia Designs Vector Mark</h3>
                <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                  Il monogramma "T" stilizzato racchiuso in una forma arrotondata con raggio 44px e gradiente teal brillante. Usato come favicon, badge e icona dell'agenzia.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadSvg}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-black font-semibold text-xs hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Scarica SVG
                  </button>
                  <button
                    onClick={copySvg}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-medium text-xs hover:bg-white/[0.1] transition-all"
                  >
                    {copiedSvg ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSvg ? 'Copiato!' : 'Copia codice SVG'}
                  </button>
                </div>
              </div>
            </div>
          </BorderGlow>
        </section>

        {/* ── Sezione 2: Palette Cromatica ── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            Palette Cromatica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BRAND_COLORS.map((c) => (
              <div
                key={c.hex}
                onClick={() => copyColor(c.hex)}
                className="group p-4 rounded-2xl bg-[#081410]/70 backdrop-blur-md border border-white/[0.08] hover:border-teal-500/40 transition-all cursor-pointer shadow-lg"
              >
                <div
                  className="w-full h-24 rounded-xl mb-3 shadow-inner border border-white/10"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    {c.name}
                  </h4>
                  <span className="font-mono text-xs text-neutral-400 group-hover:text-white">
                    {copiedColor === c.hex ? 'COPIATO!' : c.hex}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {c.usage}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sezione 3: Tipografia ── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            Tipografia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#081410]/70 border border-white/[0.08]">
              <span className="font-mono text-xs text-teal-400 uppercase font-bold tracking-wider">Font Principale — UI &amp; Display</span>
              <h3 className="text-3xl font-extrabold mt-2 mb-1" style={{ fontFamily: 'var(--font-outfit)' }}>Outfit</h3>
              <p className="text-sm text-neutral-400 mb-4">Geometrico, moderno e altamente leggibile a qualsiasi scala.</p>
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] text-sm text-neutral-300">
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 0123456789
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#081410]/70 border border-white/[0.08]">
              <span className="font-mono text-xs text-teal-400 uppercase font-bold tracking-wider">Font Monospazio — Dati &amp; Codice</span>
              <h3 className="text-3xl font-extrabold mt-2 mb-1 font-mono" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>Share Tech Mono</h3>
              <p className="text-sm text-neutral-400 mb-4">Precisione tecnica, etichette di sistema e accenti cyber/terminale.</p>
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-sm text-teal-300">
                0123456789 CONST LET RETURN TRUE FALSE NULL [PREVENTIVO]
              </div>
            </div>
          </div>
        </section>

        {/* ── Sezione 4: Filosofia di Design ── */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            Pilastri di Design
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#081410]/60 border border-white/[0.08]">
              <h4 className="font-bold text-base mb-2 text-white">Liquid Metal &amp; Dark</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Superfici oscure organiche arricchite da riflessi liquid glass e shader metallici interattivi.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#081410]/60 border border-white/[0.08]">
              <h4 className="font-bold text-base mb-2 text-white">Prestazioni Incondizionate</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Nessun compromesso: 60fps continui, WebGL throttlato con ticker unico e zero frame drop.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#081410]/60 border border-white/[0.08]">
              <h4 className="font-bold text-base mb-2 text-white">Micro-Interazioni Tattili</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ogni elemento risponde con grazia: bordi luminescenti, effetto pixel trail e cursori magnetici.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
