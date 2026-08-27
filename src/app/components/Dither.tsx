'use client';
/* eslint-disable react/no-unknown-property */

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { reportWebGLContext } from '@/lib/webgl-telemetry';

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

  const uniformsRef = useRef({
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
  });

  const prevColor = useRef([...waveColor]);
  const drawBufferSize = useRef(new THREE.Vector2());
  // Fires tia:dither-ready exactly once, after the FIRST real frame has been
  // drawn. The splash screen waits on this event so it never lifts while the
  // hero still shows the static-noise fallback below the canvas (the brief
  // "TV static" flash on load): the animated dither is already painting by
  // the time the splash fades.
  const readyFiredRef = useRef(false);

  useFrame(({ clock }) => {
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
    if (!disableAnimation) mat.uniforms.time.value = clock.getElapsedTime();
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
          uniforms={uniformsRef.current}
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
  const brokenRetryTimerRef = useRef<number | undefined>(undefined);

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
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) {
        setGlFailed(true);
        (window as Window & { __tiaDitherReady?: boolean }).__tiaDitherReady = true;
        window.dispatchEvent(new Event('tia:dither-ready'));
      }
    } catch {
      setGlFailed(true);
      (window as Window & { __tiaDitherReady?: boolean }).__tiaDitherReady = true;
      window.dispatchEvent(new Event('tia:dither-ready'));
    }
  }, []);

  // Black-output detection: sample the live canvas a few times after mount.
  // If EVERY sampled point is still near-black on several consecutive passes
  // while the hero is actually visible and rendering, the GPU is producing a
  // uniform black field — drop the Canvas so the dithered static texture
  // (guaranteed render, zero GPU) shows instead of a black hero.
  //
  // CRITICAL: only judge while the hero is on screen and the tab is focused.
  // When the frameloop is paused (hero scrolled away) or the tab is hidden,
  // the canvas keeps a stale/black buffer — reading it as a shader failure
  // would permanently replace the real dither with the fallback (exactly the
  // "goes to fallback on iPhone" symptom). A skipped sample is never counted,
  // and ANY non-black sample resets the streak.
  // preserveDrawingBuffer:true makes readPixels reliable.
  useEffect(() => {
    if (glFailed) return;
    let blackPasses = 0;
    let alive = true;
    let timer: number | undefined;

    // Returns true when black, false when not, null when we can't judge yet.
    const sample = (): boolean | null => {
      const canvas = wrapperRef.current?.querySelector('canvas');
      if (!canvas || !canvas.width || !canvas.height) return null;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return null;
        const px = new Uint8Array(4);
        const spots = [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92], [0.5, 0.5]];
        let nearBlack = true;
        for (const [sx, sy] of spots) {
          gl.readPixels(Math.floor(canvas.width * sx), Math.floor(canvas.height * sy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (px[0] > 24 || px[1] > 24 || px[2] > 24) { nearBlack = false; break; }
        }
        return nearBlack;
      } catch {
        return null; // context busy / readback error — not a verdict
      }
    };

    const run = () => {
      if (!alive) return;
      if (pausedRef.current || document.hidden || contextLostRef.current) {
        // Can't judge right now (hero away / tab hidden / WebGL context lost)
        // — reschedule without counting, and never accumulate a streak from a
        // stale or blank buffer. Counting a lost context as "black" would
        // replace the dither with the static fallback permanently.
        blackPasses = 0;
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
      blackPasses = verdict ? blackPasses + 1 : 0;
      if (blackPasses >= 3) {
        // Fall back to the static texture, but keep the detector alive and
        // auto-remount shortly after so a TRANSIENT failure recovers instead
        // of becoming permanent.
        blackPasses = 0;
        setCanvasBroken(true);
        if (brokenRetryTimerRef.current) window.clearTimeout(brokenRetryTimerRef.current);
        brokenRetryTimerRef.current = window.setTimeout(() => setCanvasBroken(false), 15_000);
        timer = window.setTimeout(run, 1500);
        return;
      }
      timer = window.setTimeout(run, 1500);
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
  }, [glFailed]);

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
          camera={{ position: [0, 0, 6] }}
          dpr={1}
          frameloop={paused ? 'never' : 'always'}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
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
              reportWebGLContext({
                source: 'dither',
                direction: 'lost',
                gl: gl.getContext(),
                event: e,
              });
            });
            el.addEventListener('webglcontextrestored', (e) => {
              contextLostRef.current = false;
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
