'use client';
/* eslint-disable react/no-unknown-property */

import { useRef, useEffect, useState, forwardRef } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { EffectComposer, wrapEffect } from '@react-three/postprocessing';
import { Effect } from 'postprocessing';
import * as THREE from 'three';

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

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
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
  vec3 col = mix(vec3(0.0), waveColor, f);
  gl_FragColor = vec4(col, 1.0);
}
`;

const ditherFragmentShader = /* glsl */ `
uniform float colorNum;
uniform float pixelSize;
const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float bias = 0.2;
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv, color.rgb);
  outputColor = color;
}
`;

// ── RetroEffect ──────────────────────────────────────────────

class RetroEffectImpl extends Effect {
  public uniforms: Map<string, THREE.Uniform<any>>;
  constructor() {
    const uniforms = new Map<string, THREE.Uniform<any>>([
      ['colorNum', new THREE.Uniform(4.0)],
      ['pixelSize', new THREE.Uniform(2.0)],
    ]);
    super('RetroEffect', ditherFragmentShader, { uniforms });
    this.uniforms = uniforms;
  }
  set colorNum(value: number) {
    this.uniforms.get('colorNum')!.value = value;
  }
  get colorNum(): number {
    return this.uniforms.get('colorNum')!.value;
  }
  set pixelSize(value: number) {
    this.uniforms.get('pixelSize')!.value = value;
  }
  get pixelSize(): number {
    return this.uniforms.get('pixelSize')!.value;
  }
}

const RetroEffect = forwardRef<RetroEffectImpl, { colorNum: number; pixelSize: number }>((props, ref) => {
  const { colorNum, pixelSize } = props;
  const WrappedRetroEffect = wrapEffect(RetroEffectImpl);
  return <WrappedRetroEffect ref={ref} colorNum={colorNum} pixelSize={pixelSize} />;
});

RetroEffect.displayName = 'RetroEffect';

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
  });

  const prevColor = useRef([...waveColor]);
  const drawBufferSize = useRef(new THREE.Vector2());

  useFrame(({ clock }) => {
    if (!mesh.current) return;
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
      <EffectComposer>
        <RetroEffect colorNum={colorNum} pixelSize={pixelSize} />
      </EffectComposer>
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

// ── Static fallback layer (touch devices + any WebGL failure) ──
// Real phones often fail to create a WebGL context (driver blocklists, no
// WebGL2, highp shader limits) — the canvas silently renders nothing and the
// hero looks like a flat black void. This layered static texture (same teal
// palette as the WebGL waves + dot grid + grain) is ALWAYS rendered as the
// base layer, so the hero can never be a black void: on desktop the opaque
// WebGL canvas covers it; anywhere WebGL is unavailable or broken, the
// static dither shows through. Guaranteed render, zero GPU, instant paint.
const NOISE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;

function StaticDitherTexture() {
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
      {/* Dither dots — the pixelated character of the effect, brighter than
          before so the grid reads clearly on a phone display. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${tealRgba(0.85)} 1.4px, rgba(0,0,0,0) 1.9px)`,
          backgroundSize: '12px 12px',
          opacity: 0.9,
        }}
      />
      {/* Grain noise in screen blend — lightens the texture like the shader */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: NOISE_URI, opacity: 0.6, mixBlendMode: 'screen' }}
      />
    </div>
  );
}

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
  const [glFailed, setGlFailed] = useState(false);
  // Canvas paints black: the context was created but the shader / EffectComposer
  // silently failed on this GPU (WebGL1 highp limits, unsupported float render
  // targets, driver quirks). When detected, the Canvas is unmounted and the
  // bright static texture below takes over — the hero can never be a black void.
  const [canvasBroken, setCanvasBroken] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The WebGL canvas runs on EVERY device — phones included — exactly like
  // the React Bits source this component is copied from (their demos run on
  // phones fine). The old matchMedia "static mode" gate hid the real dither
  // behind a static texture on touch devices, which read as a flat black
  // hero on some phones. The only fallback now is a genuine WebGL absence.

  // WebGL probe: if the context can't be created (old Safari, aggressive GPU
  // blocklists, webview containers), skip the Canvas entirely — the static
  // teal layer below shows through instead of a black void.
  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) setGlFailed(true);
    } catch {
      setGlFailed(true);
    }
  }, []);

  // Black-output detection: sample the live canvas a couple of times after
  // mount. If EVERY sampled point is still near-black on both passes, the GPU
  // is rendering a uniform black field — drop the Canvas so the static teal
  // dither (guaranteed render, zero GPU) shows instead of a black hero.
  // preserveDrawingBuffer:true makes readPixels reliable.
  useEffect(() => {
    if (glFailed) return;
    let blackPasses = 0;
    const check = () => {
      const canvas = wrapperRef.current?.querySelector('canvas');
      if (!canvas || !canvas.width || !canvas.height) return;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return;
        const px = new Uint8Array(4);
        const spots = [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92], [0.5, 0.5]];
        let nearBlack = true;
        for (const [sx, sy] of spots) {
          gl.readPixels(Math.floor(canvas.width * sx), Math.floor(canvas.height * sy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (px[0] > 24 || px[1] > 24 || px[2] > 24) { nearBlack = false; break; }
        }
        if (nearBlack) {
          blackPasses += 1;
          if (blackPasses >= 2) setCanvasBroken(true);
        } else {
          blackPasses = 0;
        }
      } catch { /* context busy / readback error — ignore, keep WebGL */ }
    };
    const t1 = window.setTimeout(check, 1000);
    const t2 = window.setTimeout(check, 2500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [glFailed]);

  // Pause WebGL rendering when the hero is scrolled out of the viewport —
  // saves GPU/battery on mobile (the dither animates only when visible).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setPaused(!entry.isIntersecting);
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
      {/* Subtle static teal base — only visible if WebGL is truly unavailable.
          On WebGL devices the opaque dither canvas paints over it completely. */}
      <StaticDitherTexture />
      {!glFailed && !canvasBroken && (
        // data-performance="heavy" marks ONLY the WebGL canvas: on genuinely
        // low-end devices the .is-low-end CSS hides just this canvas and the
        // bright static texture below stays visible — the hero can never be
        // a black void (the attribute used to sit on the WRAPPER, hiding the
        // static fallback too → black hero on every phone).
        <Canvas
          data-performance="heavy"
          camera={{ position: [0, 0, 6] }}
          dpr={1}
          frameloop={paused ? 'never' : 'always'}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
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
