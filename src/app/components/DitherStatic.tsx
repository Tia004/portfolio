'use client';

// ── Static fallback layer (touch devices + any WebGL failure) ──
// Real phones often fail to create a WebGL context (driver blocklists, no
// WebGL2, highp shader limits) — the canvas silently renders nothing and the
// hero looks like a flat black void. This layered static texture (same teal
// palette as the WebGL waves + dot grid + grain) is ALWAYS rendered as the
// base layer, so the hero can never be a black void: on desktop the opaque
// WebGL canvas covers it; anywhere WebGL is unavailable or broken, the
// static dither shows through. Guaranteed render, zero GPU, instant paint.
//
// IMPORTANT: this module must stay free of three.js / @react-three imports —
// it is imported statically by HomeShell so the hero has an instant teal
// base, and the heavy three.js chunk (Dither.tsx) only downloads later.
const NOISE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;

// Dithered teal dot field — feTurbulence noise thresholded through the alpha
// channel, so the dots are IRREGULAR (noise-driven) like the real shader's
// output, not a boring regular grid. Two scales layered give the waves depth.
const DITHER_FINE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.176  0 0 0 0 0.831  0 0 0 0 0.749  16 0 0 0 -7.2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23d)'/%3E%3C/svg%3E")`;
const DITHER_COARSE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.28' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.176  0 0 0 0 0.831  0 0 0 0 0.749  14 0 0 0 -7.0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23d)'/%3E%3C/svg%3E")`;

export function StaticDitherTexture() {
  // Teal in CSS form (waveColor is normalized RGB ≈ 0.298, 0.608, 0.510).
  const tealRgba = (a: number) => `rgba(45, 212, 191, ${a})`;
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: '#010101', touchAction: 'pan-y' }}>
      {/* Teal glow — strong radial wash so the hero has real contrast on
          small screens (the old 0.26 alpha read as "all black" on phones). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(ellipse 95% 75% at 50% 30%, ${tealRgba(0.62)}, rgba(0,0,0,0) 72%),` +
            `radial-gradient(ellipse 60% 45% at 80% 80%, ${tealRgba(0.42)}, rgba(0,0,0,0) 70%),` +
            `radial-gradient(ellipse 35% 28% at 20% 58%, ${tealRgba(0.30)}, rgba(0,0,0,0) 68%)`,
        }}
      />
      {/* Irregular dithered dots (fine + coarse) — the pixelated character
          of the shader output, noise-driven so it never reads as a grid. */}
      <div className="absolute inset-0" style={{ backgroundImage: DITHER_FINE_URI, opacity: 0.9 }} />
      <div className="absolute inset-0" style={{ backgroundImage: DITHER_COARSE_URI, opacity: 0.55 }} />
      {/* Grain noise in screen blend — lightens the texture like the shader */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: NOISE_URI, opacity: 0.55, mixBlendMode: 'screen' }}
      />
    </div>
  );
}
