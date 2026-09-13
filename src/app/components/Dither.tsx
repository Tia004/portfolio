'use client';
/* eslint-disable react/no-unknown-property */

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { reportWebGLContext, isSoftwareRenderer } from '@/lib/webgl-telemetry';

// Freeze watchdog: ONE small block of pixels whose raw bytes are compared
// between checks. One readPixels call per check — each call on a
// preserveDrawingBuffer canvas forces a GPU→CPU sync, so the watchdog must
// never read more than a single rectangle per tick.
const SIGNATURE_W = 160;
const SIGNATURE_H = 48;

// ── Shaders (exact React Bits source) ────────────────────────

const waveVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const waveFragmentShader = /* glsl */ `
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float colorNum;
uniform float pixelSize;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p + fbm(p2));
}

// 8x8 Bayer ordered-dithering threshold, computed arithmetically — the React
// Bits dither pass indexed a bayerMatrix8x8 const array dynamically, which is
// rejected on WebGL1 / GLSL ES 1.00 configs (some iOS setups), compiling to a
// BLACK canvas. This recursive construction yields all 64 thresholds with
// plain arithmetic, valid everywhere (WebGL1 and 2).
//
// IMPORTANT: the matrix must be the CANONICAL Bayer, whose rows mix high and
// low thresholds (checkerboard layout). A previous arithmetic attempt grouped
// low values on even rows and high values on odd rows — a valid ordered-dither
// matrix on paper, but it rendered as HORIZONTAL SCANLINES (measured: 78% of
// the output variance sat BETWEEN rows). The canonical construction keeps the
// dither grain inside each row (80% within-row variance) — no bands.
float bayer2(vec2 p) {
  float x = mod(p.x, 2.0);
  float y = mod(p.y, 2.0);
  return (2.0 * x + 3.0 * y - 4.0 * x * y) / 4.0; // [[0,2],[3,1]]
}
// Each level returns its RAW Bayer value normalized to 0..1 (B2/4, B4/16,
// B8/64) — the same scale as React Bits' bayerMatrix8x8 const array. The
// nesting multiplies the OUTER quadrant by /4 and /16 respectively.
float bayer4(vec2 p) {
  float x = mod(p.x, 4.0);
  float y = mod(p.y, 4.0);
  return bayer2(vec2(mod(x, 2.0), mod(y, 2.0))) + bayer2(vec2(floor(x / 2.0), floor(y / 2.0))) / 4.0;
}
float bayer8(vec2 p) {
  float x = mod(p.x, 8.0);
  float y = mod(p.y, 8.0);
  return bayer4(vec2(mod(x, 4.0), mod(y, 4.0))) + bayer2(vec2(floor(x / 4.0), floor(y / 4.0))) / 16.0;
}

  // sRGB output conversion — the React Bits demo renders through an
  // EffectComposer whose final pass converts linear → sRGB (color-managed
  // three.js). The inlined single-pass shader writes straight to the canvas,
  // so the same conversion is applied here explicitly; without it the linear
  // values render dark and desaturated on screen.
  vec3 linearTosRGB(vec3 linear) {
    return mix(linear * 12.92, 1.055 * pow(linear, vec3(1.0/2.4)) - 0.055, step(0.0031308, linear));
  }

  void main() {
  // Sample the wave at the pixel-SNAPPED uv — the exact React Bits RetroEffect
  // reads texture2D(inputBuffer, uvPixel) where uvPixel is snapped to the
  // pixelSize grid (block CORNER, not center: normalizedPixelSize *
  // floor(uv / normalizedPixelSize)). Matching the corner keeps the dither
  // output pixel-identical to the React Bits demo; a +0.5px center offset
  // shifts every wave value and lands 70%+ of pixels on different levels.
  vec2 cell = floor(gl_FragCoord.xy / pixelSize) * pixelSize;
  vec2 uv = cell / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  vec3 col = mix(vec3(0.0), waveColor, clamp(f, 0.0, 1.0));

  // Per-channel ordered dithering with the 8x8 Bayer matrix — the exact React
  // Bits RetroEffect algorithm, inlined into this single pass so there is no
  // postprocessing pipeline (the EffectComposer + const-array combo silently
  // compiled to a black canvas on iOS Safari). Each RGB channel quantizes
  // INDEPENDENTLY, which is what produces the colorful pixel grain.
  //
  // The threshold coordinate comes from gl_FragCoord (PER-PIXEL), NOT from the
  // cell-centered uv above: React Bits passes its per-pixel uv into dither()
  // while sampling the wave color at the pixel-snapped uv. If the threshold
  // used the snapped uv too, every pixel inside a 2x2 block would share the
  // same threshold → solid blocks that read as "righette" instead of dots.
  vec2 scaledCoord = floor(gl_FragCoord.xy / pixelSize);
  float threshold = bayer8(scaledCoord) - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  col += threshold * step;
  col = clamp(col - 0.2, 0.0, 1.0);
  col = floor(col * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
  gl_FragColor = vec4(linearTosRGB(col), 1.0);
  }
`;

// ── DitheredWaves ────────────────────────────────────────────

function DitheredWaves({
  waveSpeed,
  waveFrequency,
  waveAmplitude,
  waveColor,
  colorNum,
  pixelSize,
  disableAnimation,
  enableMouseInteraction,
  mouseRadius,
}: {
  waveSpeed: number;
  waveFrequency: number;
  waveAmplitude: number;
  waveColor: [number, number, number];
  colorNum: number;
  pixelSize: number;
  disableAnimation: boolean;
  enableMouseInteraction: boolean;
  mouseRadius: number;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mouseRef = useRef(new THREE.Vector2());
  const { viewport, gl } = useThree();

  // Created once per mount via useState's lazy initialiser (not useRef): the
  // values are driven imperatively from useFrame through the material's cloned
  // uniforms, so the object only needs to exist and be stable — reading a ref
  // during render is exactly what the react-hooks/refs rule flags.
  const [uniforms] = useState(() => ({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    waveColor: new THREE.Uniform(new THREE.Color(...waveColor)),
    mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
    enableMouseInteraction: new THREE.Uniform(enableMouseInteraction ? 1 : 0),
    mouseRadius: new THREE.Uniform(mouseRadius),
    colorNum: new THREE.Uniform(colorNum),
    pixelSize: new THREE.Uniform(pixelSize),
  }));

  const prevColor = useRef([...waveColor]);
  const drawBufferSize = useRef(new THREE.Vector2());
  // Fires tia:dither-ready exactly once, after the FIRST real frame has been
  // drawn. The splash screen waits on this event so it never lifts while the
  // hero still shows the static-noise fallback below the canvas (the brief
  // "TV static" flash on load): the animated dither is already painting by
  // the time the splash fades.
  const readyFiredRef = useRef(false);

  // Own elapsed time instead of three's `clock`: three r183 deprecated
  // THREE.Clock (the "THREE.Clock has been deprecated" warning in the console
  // came from @react-three/fiber instantiating it), and accumulating a delta
  // ourselves also avoids a time jump when the loop resumes after the hero
  // scrolls back into view.
  const elapsedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  useFrame(() => {
    if (!mesh.current) return;
    if (!readyFiredRef.current) {
      readyFiredRef.current = true;
      (window as Window & { __tiaDitherReady?: boolean }).__tiaDitherReady = true;
      window.dispatchEvent(new Event('tia:dither-ready'));
    }
    // Access the material's actual cloned uniforms — uniformsRef holds only the initial values
    const mat = mesh.current.material as THREE.ShaderMaterial;
    // Resolution guard — CRITICAL on mobile: the uniform starts at (0,0) and
    // a resize effect runs only AFTER the first frames. Until it's set, the
    // shader computes gl_FragCoord / (0,0) = NaN and paints the whole canvas
    // black — the classic "black hero" on devices whose mount timing differs.
    // Syncing from the real drawing-buffer size every frame is cheap and
    // makes even the very first frame correct.
    const res = mat.uniforms.resolution.value as THREE.Vector2;
    const db = gl.getDrawingBufferSize(drawBufferSize.current);
    if (res.x !== db.x || res.y !== db.y) res.copy(db);
    const now = performance.now();
    if (!disableAnimation && lastTickRef.current !== null) {
      elapsedRef.current += Math.min(0.1, (now - lastTickRef.current) / 1000);
    }
    lastTickRef.current = now;
    if (!disableAnimation) mat.uniforms.time.value = elapsedRef.current;
    mat.uniforms.waveSpeed.value = waveSpeed;
    mat.uniforms.waveFrequency.value = waveFrequency;
    mat.uniforms.waveAmplitude.value = waveAmplitude;
    if (!prevColor.current.every((v, i) => v === waveColor[i])) {
      (mat.uniforms.waveColor.value as THREE.Color).set(...waveColor);
      prevColor.current = [...waveColor];
    }
    mat.uniforms.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0;
    mat.uniforms.mouseRadius.value = mouseRadius;
    if (enableMouseInteraction) (mat.uniforms.mousePos.value as THREE.Vector2).copy(mouseRef.current);
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!enableMouseInteraction) return;
    const rect = gl.domElement.getBoundingClientRect();
    const dpr = gl.getPixelRatio();
    mouseRef.current.set((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
  };

  return (
    <>
      <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={waveVertexShader}
          fragmentShader={waveFragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      <mesh
        onPointerMove={handlePointerMove}
        position={[0, 0, 0.01]}
        scale={[viewport.width, viewport.height, 1]}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

// The static teal base layer lives in DitherStatic.tsx and is rendered
// unconditionally by HomeShell — this component is the WebGL overlay only.
// It paints over the static base where WebGL works, and any failure just
// leaves the static base visible (never a black hero). Keeping three.js out
// of DitherStatic means the ~230KB WebGL chunk only downloads on demand.

// ── Public component ─────────────────────────────────────────

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5] as [number, number, number],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
}: {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
}) {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [glFailed, setGlFailed] = useState(false);
  // Bumped to remount the <Canvas> with a BRAND NEW WebGL context when the
  // current one is unusable (context lost and never restored, or a frozen
  // frame). Chrome/Windows drivers can leave a lost context permanently
  // black or, worse, showing the last garbage buffer — the "sfondo tutto
  // noise" symptom — so a fresh context is the only reliable recovery.
  const [canvasKey, setCanvasKey] = useState(0);
  // True while the WebGL context is lost: the canvas is hidden so the dark
  // static base (same palette) shows instead of the driver's garbage frame.
  const [contextLost, setContextLost] = useState(false);
  // Canvas paints black: the context was created but the shader / EffectComposer
  // silently failed on this GPU (WebGL1 highp limits, unsupported float render
  // targets, driver quirks). When detected, the Canvas is unmounted and the
  // bright static texture below takes over — the hero can never be a black void.
  const [canvasBroken, setCanvasBroken] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // True while the WebGL context is lost (tab backgrounded under GPU memory
  // pressure, etc.). three.js already skips rendering then; we must also NOT
  // let the black-output detector declare the canvas "broken" during that
  // window, or we would permanently replace the dither with the static
  // fallback (the "TV noise" symptom).
  const contextLostRef = useRef(false);
  const contextLostSinceRef = useRef(0);
  const brokenRetryTimerRef = useRef<number | undefined>(undefined);
  // Latest frame signature (see the freeze watchdog) — a frozen canvas keeps
  // painting the SAME bytes while time keeps advancing.
  const frozenStreakRef = useRef(0);
  const lastSignatureRef = useRef<string | null>(null);

  // The WebGL canvas runs on EVERY device — phones included — exactly like
  // the React Bits source this component is copied from (their demos run on
  // phones fine). The old matchMedia "static mode" gate hid the real dither
  // behind a static texture on touch devices, which read as a flat black
  // hero on some phones. The only fallback now is a genuine WebGL absence.

  // WebGL probe: if the context can't be created (old Safari, aggressive GPU
  // blocklists, webview containers), skip the Canvas entirely — the static
  // teal layer below shows through instead of a black void. In that case the
  // static layer IS the intended final visual (there is no WebGL frame to
  // wait for), so fire tia:dither-ready immediately rather than letting the
  // splash hang until its safety cap.
  useEffect(() => {
    const bail = () => {
      setGlFailed(true);
      (window as Window & { __tiaDitherReady?: boolean }).__tiaDitherReady = true;
      window.dispatchEvent(new Event('tia:dither-ready'));
    };
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      // No context, or a SOFTWARE one (SwiftShader / llvmpipe / "Microsoft
      // Basic Render Driver"): a full-screen multi-octave noise shader on a
      // CPU rasteriser runs at a handful of frames per second — that is the
      // "site freezes on Windows" report — and its fast-math sin/cos can
      // saturate the field into a flat colour wash. The static teal base below
      // has the same palette, so skipping WebGL is both invisible and fast.
      if (!gl || isSoftwareRenderer(gl)) bail();
    } catch {
      bail();
    }
  }, []);

  // Dead-canvas detection: sample a GRID across the live canvas a few times
  // after mount and declare the GPU dead only when the buffer is a FLAT fill.
  //
  // The previous heuristic ("5 spots near-black") was built for the old BRIGHT
  // palette, where a dark hero meant a broken shader. With the current DEEP
  // teal palette most of the wave field IS dark — so the detector regularly
  // declared a perfectly healthy canvas broken and swapped the hero to the
  // bright static fallback for 15s at a time: exactly the "sometimes it turns
  // into TV static, then comes back" symptom. A flat buffer (max-min ≈ 0 over
  // 96 samples) can only come from a canvas that paints one uniform colour
  // (black shader, dead GPU), because the animated field always has both
  // bright and dark areas.
  //
  // CRITICAL: only judge while the hero is on screen and the tab is focused.
  // When the frameloop is paused (hero scrolled away) or the tab is hidden,
  // the canvas keeps a stale/black buffer — reading it as a shader failure
  // would permanently replace the real dither with the fallback. A skipped
  // sample is never counted, and ANY structured sample resets the streak.
  // preserveDrawingBuffer:true makes readPixels reliable.
  useEffect(() => {
    if (glFailed) return;
    let deadPasses = 0;
    let alive = true;
    let timer: number | undefined;

    // Returns true when the canvas is a flat fill, false when it shows
    // structure, null when we can't judge yet.
    const sample = (): boolean | null => {
      const canvas = wrapperRef.current?.querySelector('canvas');
      if (!canvas || !canvas.width || !canvas.height) return null;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return null;
        // FOUR readPixels calls, not 96. Every gl.readPixels on a
        // preserveDrawingBuffer canvas forces a GPU→CPU sync, so the old 96
        // single-pixel grid flushed the pipeline ~96 times per 1.5s — a
        // visible stall on integrated GPUs and the main cause of the
        // "freezes on Windows" report. Four spread-out 64×24 blocks (6144
        // pixels) still tell a structured field from a flat fill.
        const REGION_W = 64;
        const REGION_H = 24;
        const buffer = new Uint8Array(REGION_W * REGION_H * 4);
        let min = 255;
        let max = 0;
        for (const fy of [0.12, 0.88]) {
          for (const fx of [0.08, 0.92]) {
            const x = Math.min(
              Math.max(0, Math.floor(canvas.width * fx) - REGION_W / 2),
              Math.max(0, canvas.width - REGION_W)
            );
            const y = Math.min(
              Math.max(0, Math.floor(canvas.height * fy) - REGION_H / 2),
              Math.max(0, canvas.height - REGION_H)
            );
            gl.readPixels(x, y, REGION_W, REGION_H, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
            for (let i = 0; i < buffer.length; i += 4) {
              const l = 0.2126 * buffer[i] + 0.7152 * buffer[i + 1] + 0.0722 * buffer[i + 2];
              if (l < min) min = l;
              if (l > max) max = l;
            }
          }
        }
        return max - min < 4;
      } catch {
        return null; // context busy / readback error — not a verdict
      }
    };

    const run = () => {
      if (!alive) return;
      if (pausedRef.current || document.hidden || contextLostRef.current) {
        // Can't judge right now (hero away / tab hidden / WebGL context lost)
        // — reschedule without counting, and never accumulate a streak from a
        // stale or blank buffer. Counting a lost context as "dead" would
        // replace the dither with the static fallback permanently.
        deadPasses = 0;
        timer = window.setTimeout(run, 800);
        return;
      }
      const verdict = sample();
      if (verdict === null) {
        // Canvas not mounted/sized yet (slow phone, late mount, or currently
        // in the fallback state) — reschedule.
        timer = window.setTimeout(run, 800);
        return;
      }
      deadPasses = verdict ? deadPasses + 1 : 0;
      if (deadPasses >= 5) {
        // Fall back to the static texture, but keep the detector alive and
        // auto-remount shortly after so a TRANSIENT failure recovers instead
        // of becoming permanent.
        deadPasses = 0;
        setCanvasBroken(true);
        if (brokenRetryTimerRef.current) window.clearTimeout(brokenRetryTimerRef.current);
        brokenRetryTimerRef.current = window.setTimeout(() => setCanvasBroken(false), 15_000);
        timer = window.setTimeout(run, 4000);
        return;
      }
      timer = window.setTimeout(run, 4000);
    };

    timer = window.setTimeout(run, 2000);
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
      if (brokenRetryTimerRef.current) {
        window.clearTimeout(brokenRetryTimerRef.current);
        brokenRetryTimerRef.current = undefined;
      }
    };
  }, [glFailed, canvasKey]);

  // ── Freeze watchdog + lost-context recovery ────────────────────────────
  // Two failure modes left the hero stuck on a static (sometimes garbled)
  // frame until a manual reload:
  //   1. the rAF loop keeps running but the GPU stops producing new frames
  //      (driver stall, GPU process restart) — the image just FREEZES;
  //   2. the context is lost and the browser never restores it — the canvas
  //      ends up blank or showing the driver's last garbage buffer, which on
  //      some machines looks like pure TV noise.
  // Both are fixed the same way: a fresh context (canvasKey bump). Freezing is
  // detected by comparing a pixel signature across checks — a healthy dither
  // never repeats 180 sampled bytes for 12s straight while the tab is visible.
  useEffect(() => {
    if (glFailed || canvasBroken) return;
    let alive = true;
    let timer: number | undefined;

    const signature = (): string | null => {
      const canvas = wrapperRef.current?.querySelector('canvas');
      if (!canvas || !canvas.width || !canvas.height) return null;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return null;
        const w = Math.min(canvas.width, SIGNATURE_W);
        const h = Math.min(canvas.height, SIGNATURE_H);
        const block = new Uint8Array(w * h * 4);
        gl.readPixels(
          Math.max(0, (canvas.width - w) >> 1),
          Math.max(0, (canvas.height - h) >> 1),
          w,
          h,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          block
        );
        let sig = '';
        for (let k = 0; k < block.length; k += 4) {
          sig += String.fromCharCode(block[k], block[k + 1], block[k + 2]);
        }
        return sig;
      } catch {
        return null;
      }
    };

    const run = () => {
      if (!alive) return;
      const skip = pausedRef.current || document.hidden || contextLostRef.current || disableAnimation;
      if (skip) {
        frozenStreakRef.current = 0;
        lastSignatureRef.current = null;
      } else {
        const sig = signature();
        if (sig !== null) {
          frozenStreakRef.current = sig === lastSignatureRef.current ? frozenStreakRef.current + 1 : 0;
          lastSignatureRef.current = sig;
          if (frozenStreakRef.current >= 8) {
            frozenStreakRef.current = 0;
            lastSignatureRef.current = null;
            console.warn('[dither] frozen frame — remounting the WebGL canvas');
            setCanvasKey((k) => k + 1);
            timer = window.setTimeout(run, 4000);
            return;
          }
        }
      }
      // A lost context that the browser never restores (or restores into a
      // dead canvas) is just as stuck: remount after ~5s so the hero keeps
      // animating instead of showing garbage.
      if (contextLostRef.current && Date.now() - contextLostSinceRef.current > 5000) {
        contextLostSinceRef.current = Date.now();
        console.warn('[dither] WebGL context lost without restore — remounting');
        setCanvasKey((k) => k + 1);
      }
      timer = window.setTimeout(run, 2000);
    };

    timer = window.setTimeout(run, 4000);
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [glFailed, canvasBroken, disableAnimation]);

  // Pause WebGL rendering when the hero is scrolled out of the viewport —
  // saves GPU/battery on mobile (the dither animates only when visible).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      pausedRef.current = !entry.isIntersecting;
      setPaused(pausedRef.current);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: 'transparent',
        // Never hijack touch/scroll gestures: vertical page scroll keeps
        // working on mobile even though the dither covers the hero.
        touchAction: 'pan-y',
      }}
    >
      {/* No static base here — DitherStatic.tsx provides it under this overlay. */}
      {!glFailed && !canvasBroken && (
        // The WebGL canvas runs on every device. (The old `.is-low-end
        // [data-performance="heavy"] { display:none }` CSS rule that could
        // hide it on phones was removed — genuine GPU failures are handled
        // here by the WebGL probe + black-output detection instead.)
        <Canvas
          // key: a bump remounts the whole Canvas with a FRESH WebGL context
          // (freeze watchdog + lost-context recovery).
          key={canvasKey}
          camera={{ position: [0, 0, 6] }}
          dpr={1}
          frameloop={paused ? 'never' : 'always'}
          // antialias:false — the shader quantises every channel to ~8 levels,
          // so MSAA cannot smooth anything on this full-screen quad; it only
          // adds a resolve pass per frame (measurable on integrated GPUs).
          gl={{ antialias: false, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            // Track context loss so the black-output detector above doesn't
            // mistake a lost (blank) context for a broken shader. three.js
            // already preventDefaults the loss event and resumes rendering on
            // restore; we mirror the state for the detector AND report the
            // event (console + analytics) so a recurring "TV static" symptom
            // can be correlated with GPU/driver/memory conditions.
            const el = gl.domElement;
            el.addEventListener('webglcontextlost', (e) => {
              contextLostRef.current = true;
              contextLostSinceRef.current = Date.now();
              // Hide the canvas immediately: a lost context can keep showing the
              // driver's last (garbage) buffer — the "TV noise" frame. The
              // dark static base below has the same palette, so hiding is
              // invisible, and the watchdog remounts if the restore never comes.
              setContextLost(true);
              reportWebGLContext({
                source: 'dither',
                direction: 'lost',
                gl: gl.getContext(),
                event: e,
              });
            });
            el.addEventListener('webglcontextrestored', (e) => {
              contextLostRef.current = false;
              frozenStreakRef.current = 0;
              lastSignatureRef.current = null;
              setContextLost(false);
              reportWebGLContext({
                source: 'dither',
                direction: 'restored',
                gl: gl.getContext(),
                event: e,
              });
            });
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            // Pass vertical scroll to the page instead of trapping it.
            touchAction: 'pan-y',
            // While the context is lost the canvas can display garbage: hide
            // it (keeping it mounted, so the restore still happens) and let
            // the palette-matched static base show through.
            visibility: contextLost ? 'hidden' : 'visible',
          }}
        >
          <DitheredWaves
            waveSpeed={waveSpeed}
            waveFrequency={waveFrequency}
            waveAmplitude={waveAmplitude}
            waveColor={waveColor}
            colorNum={colorNum}
            pixelSize={pixelSize}
            disableAnimation={disableAnimation}
            enableMouseInteraction={enableMouseInteraction}
            mouseRadius={mouseRadius}
          />
        </Canvas>
      )}
    </div>
  );
}
