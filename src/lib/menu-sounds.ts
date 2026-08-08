/**
 * Subtle synthetic sounds for menu open/close — no external files.
 * Uses Web Audio API to generate a short whoosh/click.
 * Volume is intentionally very low (-30dB) to be discreet.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Short rising whoosh — for menu open.
 * White noise burst through a bandpass filter that sweeps up.
 */
export function playMenuOpenSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const duration = 0.18;
  const now = ctx.currentTime;

  // ── Noise source ──
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // ── Bandpass filter — sweeps from 800Hz to 3000Hz ──
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.linearRampToValueAtTime(3000, now + duration);
  filter.Q.value = 1.5;

  // ── Volume envelope — quick attack, slow decay ──
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.02);   // -30dB peak
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // ── Connect & play ──
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration + 0.05);
}

/**
 * Short descending click/whoosh — for menu close.
 * Lower, shorter, slightly different character.
 */
export function playMenuCloseSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const duration = 0.15;
  const now = ctx.currentTime;

  // ── Noise source ──
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // ── Bandpass filter — sweeps from 2000Hz down to 400Hz ──
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.linearRampToValueAtTime(400, now + duration);
  filter.Q.value = 2;

  // ── Volume envelope — sharp attack, quick decay ──
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.025, now + 0.01);  // -32dB peak
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // ── Connect & play ──
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration + 0.05);
}
