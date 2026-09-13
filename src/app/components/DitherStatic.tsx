'use client';

// ── Static fallback layer (no WebGL / broken context / broken shader) ──
// ALWAYS rendered under the WebGL canvas, so the hero can never be a black
// void while three.js is still downloading or when the GPU can't render.
//
// THE PALETTE MUST MATCH THE SHADER (see Dither.tsx / HomeShell's waveColor
// [0.165, 0.718, 0.624] = deep teal): the old version of this layer was built
// as a bright, high-contrast mint wash with strong TV-style grain — "make the
// hero pop on small screens". That turned every WebGL hiccup into a blinding,
// noisy hero: on machines where the context is lost / software-rendered this
// layer IS the page, so the site looked like a broken CRT (huge brightness,
// random noise) while macOS on a healthy GPU showed the dark dither. A
// fallback is only a fallback: it must be indistinguishable from the thing it
// replaces, so it is now dark, low-contrast and grain-light — same hue, same
// taste, no broadcast static.
//
// IMPORTANT: this module must stay free of three.js / @react-three imports —
// it is imported statically by HomeShell so the hero has an instant dark base,
// and the heavy three.js chunk (Dither.tsx) only downloads later.
// Dithered teal dot field — feTurbulence noise thresholded through the alpha
// channel, so the dots are IRREGULAR (noise-driven) like the real shader's
// output, not a boring regular grid. Two scales layered give the waves depth.
// baseFrequency stays LOW (0.34 / 0.16): high frequencies (≥0.7) are exactly
// what reads as "50s TV static" instead of dither grain.
// The dot density is set by the alpha row (slope + offset) of the colour
// matrix: slope 9 / offset -5.6 keeps roughly a third of the noise field,
// which is what reads as SPARSE dither grain. (The old slope 16 / offset -7.2
// covered most of the field and, layered under the radial wash, turned the
// fallback into a solid teal blanket.)
// Dot colour follows the shader's dimmed teal (waveColor * 0.75 in HomeShell):
// 0.176/0.831/0.749 -> 0.132/0.623/0.562. Keep the two in step.
const DITHER_FINE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.34' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.132  0 0 0 0 0.623  0 0 0 0 0.562  9 0 0 0 -5.6'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23d)'/%3E%3C/svg%3E")`;
const DITHER_COARSE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.16' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.132  0 0 0 0 0.623  0 0 0 0 0.562  8 0 0 0 -5.4'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23d)'/%3E%3C/svg%3E")`;

export function StaticDitherTexture() {
  // Teal in CSS form (waveColor is normalized RGB ≈ 0.165, 0.718, 0.624).
  // The shader multiplies it by the wave field (f ≈ 0.05-0.45) minus a 0.2
  // offset, so the on-screen teal is always DEEP — these alphas are the CSS
  // equivalent of that, not a bright wash.
  // 45/212/191 is the shader's teal at full amplitude; scaled by the same 0.75
  // as waveColor in HomeShell -> 34/159/143.
  const tealRgba = (a: number) => `rgba(34, 159, 143, ${a})`;
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: '#010101', touchAction: 'pan-y' }}>
      {/* Deep teal field — a soft, low-alpha wash that follows the shader's
          bright/dark balance (bright mass upper-centre, dimmer right and left)
          without ever approaching full mint. */}
      {/* BRIGHTNESS BUDGET: the shader's own field measures (on a healthy GPU)
          mean luminance ~61/255 with peaks around 150 — mostly dark, teal only
          in the ridges. Anything brighter here is a visible defect, because
          this layer is what shows on machines without usable WebGL. The alphas
          below land the same ballpark (measured peak ~90, mean ~40): a dark
          field with teal ridges, not a green wash over the hero. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(ellipse 85% 70% at 46% 32%, ${tealRgba(0.24)}, rgba(0,0,0,0) 72%),` +
            `radial-gradient(ellipse 55% 45% at 78% 74%, ${tealRgba(0.15)}, rgba(0,0,0,0) 70%),` +
            `radial-gradient(ellipse 40% 32% at 22% 62%, ${tealRgba(0.10)}, rgba(0,0,0,0) 68%)`,
        }}
      />
      {/* Irregular dithered dots (fine + coarse) — the pixelated character of
          the shader output. Low opacity: this is texture, not noise. */}
      <div className="absolute inset-0" style={{ backgroundImage: DITHER_FINE_URI, opacity: 0.18 }} />
      <div className="absolute inset-0" style={{ backgroundImage: DITHER_COARSE_URI, opacity: 0.10 }} />
    </div>
  );
}
