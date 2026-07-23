'use client';

import React, { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * FooterAnimation — split-text rising wordmark + gradient glow
 * Inspired by annnimate.com's footer. Animates "Tia Designs" letter-by-letter
 * as the user scrolls into the footer.
 */
export default function FooterAnimation() {
  const sectionRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Use useLayoutEffect to split text BEFORE paint — avoids FOUT
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
      span.style.display = 'inline-block';
      wordmark.appendChild(span);
    });

    const chars = wordmark.querySelectorAll<HTMLSpanElement>('.footer-char');

    const ctx = gsap.context(() => {
      // Gradient glow: shift position on scroll
      gsap.to(glow, {
        backgroundPosition: '50% 100%',
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      });

      // Characters rise & fade in with stagger
      gsap.fromTo(
        chars,
        { y: 80, opacity: 0, rotateX: -15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          stagger: 0.04,
          duration: 1,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 35%',
            scrub: 1,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={sectionRef} className="relative bg-[#050505] text-white py-24 px-4 border-t border-white/5 overflow-hidden">
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

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Rising wordmark */}
        <div
          ref={wordmarkRef}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-white text-center mb-16 leading-none"
          style={{ perspective: '800px' }}
        />

        {/* Sub-footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <img src="/TiaDesignsLogo.png" alt="Tia Designs" loading="lazy" className="h-8 w-auto mb-4 brightness-0 invert select-none" draggable="false" />
            <p className="text-neutral-400 text-xs leading-relaxed max-w-xs">
              Designer, sviluppatore app e software, videomaker. Trasformo idee in prodotti digitali completi.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">Servizi</h4>
            <ul className="space-y-2">
              {['UX/UI Design', 'Sviluppo App', 'Sviluppo Software', 'Video Making', 'Consulenza'].map((s) => (
                <li key={s}><a href="#servizi" className="text-neutral-400 hover:text-white transition-colors text-xs">{s}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">Link</h4>
            <ul className="space-y-2">
              {['Progetti', 'Prezzi', 'Recensioni', 'FAQ', 'Contatti'].map((l) => (
                <li key={l}><a href={`#${l.toLowerCase()}`} className="text-neutral-400 hover:text-white transition-colors text-xs">{l}</a></li>
              ))}
              <li><Link href="/loginmaster" className="text-neutral-400 hover:text-white transition-colors text-xs">Master Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-4">Contatti</h4>
            <ul className="space-y-2 text-neutral-400 text-xs">
              <li>Mantova, Italia</li>
              <li><a href="mailto:tiachinaglia@gmail.com" className="hover:text-white transition-colors">tiachinaglia@gmail.com</a></li>
              <li><a href="tel:+393318821334" className="hover:text-white transition-colors">+39 331 882 1334</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-neutral-500 text-xs">© 2026 Tia Designs. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4 text-neutral-500 text-xs">
            <span>Mantova, Italia</span>
            <span className="w-1 h-1 rounded-full bg-neutral-500" />
            <span>GMT+2</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
