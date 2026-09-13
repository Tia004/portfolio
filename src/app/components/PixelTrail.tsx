'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame, CanvasProps } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { isLowEndDevice } from '@/lib/useDeviceCapabilities';
import { scheduleTick, unscheduleTick } from '@/lib/useSharedTicker';

interface SceneProps {
  gridSize: number;
  trailSize: number;
  maxAge: number;
  interpolate: number;
  easingFunction: (x: number) => number;
  pixelColor: string;
  paused: boolean;
  /** True only after a real pointer movement has been seen — see the arm gate
   *  in PixelTrail below. Keeps the fullscreen layer perfectly transparent
   *  until there is a legitimate trail to draw. */
  armed: boolean;
  /** Fired after the FIRST frame has actually been rendered. */
  onFirstFrame: () => void;
}

interface PixelTrailProps {
  /** Fired once, after the layer is ARMED (first real pointer movement) and has
   *  rendered a real frame. The parent uses it to decide whether the native
   *  cursor may be hidden: a layer that never draws must never leave the
   *  visitor without a pointer. */
  onReady?: () => void;
  gridSize?: number;
  trailSize?: number;
  maxAge?: number;
  interpolate?: number;
  easingFunction?: (x: number) => number;
  canvasProps?: Partial<CanvasProps>;
  glProps?: WebGLContextAttributes & { powerPreference?: string };
  color?: string;
  className?: string;
}

// ─── Trail buffer (replaces @react-three/drei's useTrailTexture) ───────────
//
// WHY THIS EXISTS — this is the fix for the "green halo over the whole site"
// that only appeared on some Windows/ANGLE machines (and, intermittently,
// everywhere): drei's `useTrailTexture` paints the trail into a 2D CANVAS and
// hands that canvas to a `THREE.Texture`. On drivers that mis-sample a
// canvas-backed texture the sampler returned 1.0 for EVERY texel, so
// `trailAlpha = pow(rawTrail, 0.55)` became 1.0 across the fullscreen quad and
// the shader painted one flat teal colour over the entire viewport (this layer
// sits at z-index 99999, above nav, hero and modals).
//
// A canvas is also the wrong container here: nothing in the trail needs 2D
// drawing — it is a scalar field on a small grid. This class owns that field
// directly as a Uint8Array uploaded through a DataTexture, which means:
//   • the render target is NOT a driver-managed canvas-fallback, so it cannot
//     sample as white — every byte comes from our own writes (we can prove the
//     buffer is all zeros at mount, so a fresh layer is provably invisible);
//   • the decay runs on frames rather than on pointer events, so the trail
//     always fades out instead of freezing on its last shape when the pointer
//     stops (this is what drei's `useFrame` update did, now done by us);
//   • no CPU→GPU readback and no per-frame canvas rasterisation.
//
// Rows/columns follow the SHADER's convention: DataTexture keeps flipY = false
// and the shader derives uv from gl_FragCoord, i.e. v = 0 at the BOTTOM of the
// screen — which is exactly where the pointer uv comes from (`1 - clientY / h`).
// No extra flip is applied.
const TRAIL_PEAK = 0.8; // centre intensity of a freshly stamped point (0..1)

class TrailBuffer {
  readonly texture: THREE.DataTexture;
  private readonly data: Uint8Array;
  private readonly size: number;
  /** Stamp radius in grid cells. */
  private readonly radius: number;
  /** Exponential decay time constant, in seconds. */
  private readonly tau: number;
  private last: { x: number; y: number } | null = null;
  /** True while every cell is already zero — skips pointless GPU uploads. */
  private clean = true;

  constructor({
    size,
    trailSize,
    maxAge,
  }: {
    size: number;
    trailSize: number;
    maxAge: number;
  }) {
    this.size = size;
    this.radius = Math.max(1, trailSize * size);
    // A point should be gone in ~maxAge ms: exp(-maxAge/tau) ≈ 5%.
    this.tau = Math.max(0.02, maxAge / 3000);
    this.data = new Uint8Array(size * size); // all zeros -> the layer is invisible
    this.texture = new THREE.DataTexture(
      this.data,
      size,
      size,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    // Raw values (no colour conversion) and blocky, trail-like sampling.
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  /** Stamp the pointer position (uv in 0..1, bottom-left origin). */
  addTouch(uv: { x: number; y: number }) {
    const x = uv.x * this.size;
    const y = uv.y * this.size;
    if (this.last) {
      this.stampSegment(this.last.x, this.last.y, x, y);
    } else {
      this.stampSegment(x, y, x, y);
    }
    this.last = { x, y };
    this.clean = false;
  }

  /** Forget the last point so the next stamp cannot connect to it. */
  reset() {
    this.last = null;
  }

  /**
   * Stamp a capsule between two grid-space points: every cell within `radius`
   * of the segment gets the peak value scaled by a linear falloff. Doing the
   * whole segment in one pass is what `interpolate` did in drei — it keeps the
   * trail continuous at high cursor speeds — but in a single sweep instead of
   * dozens of interpolated dabs.
   */
  private stampSegment(x0: number, y0: number, x1: number, y1: number) {
    const r = this.radius;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r));
    const maxX = Math.min(this.size - 1, Math.ceil(Math.max(x0, x1) + r));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r));
    const maxY = Math.min(this.size - 1, Math.ceil(Math.max(y0, y1) + r));

    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;

    for (let cy = minY; cy <= maxY; cy++) {
      const py = cy + 0.5;
      const row = cy * this.size;
      for (let cx = minX; cx <= maxX; cx++) {
        const px = cx + 0.5;
        // Distance from the cell centre to the segment.
        let t = 0;
        if (lenSq > 0) {
          t = ((px - x0) * dx + (py - y0) * dy) / lenSq;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
        }
        const ox = px - (x0 + t * dx);
        const oy = py - (y0 + t * dy);
        const d = Math.sqrt(ox * ox + oy * oy) / r;
        if (d >= 1) continue;
        const value = (1 - d) * TRAIL_PEAK * 255;
        const index = row + cx;
        if (value > this.data[index]) this.data[index] = value;
      }
    }
    this.texture.needsUpdate = true;
  }

  /** Age the whole field and upload it when anything changed. */
  update(delta: number) {
    if (this.clean) return;
    // Clamp: with frameloop="demand" a long idle gap would otherwise decay the
    // whole trail to zero in one step and read as a hard pop.
    const dt = Math.min(0.1, delta || 0);
    const factor = Math.exp(-dt / this.tau);
    const data = this.data;
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const next = data[i] * factor;
      const quantised = next < 1 ? 0 : next;
      data[i] = quantised;
      if (quantised > max) max = quantised;
    }
    if (max === 0) {
      this.clean = true;
      // Zeroing already happened above — one last upload clears the GPU copy.
    }
    this.texture.needsUpdate = true;
  }
}

const DotMaterial = shaderMaterial(
  {
    resolution: new THREE.Vector2(),
    mouseTrail: null,
    gridSize: 100,
    pixelColor: new THREE.Color('#ffffff'),
    cursorGrid: new THREE.Vector2(-1, -1),
    time: 0,
    uArmed: 0,
  },
  /* glsl vertex shader */ `
    varying vec2 vUv;
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  /* glsl fragment shader */ `
    precision mediump float;

    uniform vec2 resolution;
    uniform sampler2D mouseTrail;
    uniform float gridSize;
    uniform vec3 pixelColor;
    uniform vec2 cursorGrid;
    uniform float time;
    uniform float uArmed;

    vec2 coverUv(vec2 uv) {
      vec2 s = resolution.xy / max(resolution.x, resolution.y);
      vec2 newUv = (uv - 0.5) * s + 0.5;
      return clamp(newUv, 0.0, 1.0);
    }

    void main() {
      // Fail-safe: with a non-finite or zero resolution every uv becomes NaN
      // and NaN behaviour is DRIVER-DEPENDENT — on some GPUs it collapses the
      // whole quad into one flat colour, which is exactly how the fullscreen
      // cursor layer turned into a teal wash over the entire site on some
      // machines. Draw nothing instead of drawing garbage.
      if (!(resolution.x > 0.0) || !(resolution.y > 0.0)) {
        gl_FragColor = vec4(0.0);
        return;
      }
      vec2 screenUv = gl_FragCoord.xy / resolution;
      vec2 uv = coverUv(screenUv);

      vec2 gridCoord = floor(uv * gridSize);
      vec2 gridUvCenter = (gridCoord + 0.5) / gridSize;
      // Ease-out curve for softer trail decay — low values (tail)
      // are boosted so the trail lingers instead of cutting off abruptly.
      // Applied only to the final pixel, not the intermediate trail value,
      // so pop/ring timing (which reads trail) stays calibrated.
      float rawTrail = texture2D(mouseTrail, gridUvCenter).r;
      float trail = rawTrail;

      // Idle dot with pop animation — trail-driven so it always syncs with decay.
      // popProgress 0 = trail still fading (dot at size 0)
      // popProgress 1 = trail gone (dot at full cell size)
      float popProgress = 1.0 - smoothstep(0.0, 0.08, trail);
      vec2 cursorCell = floor(cursorGrid);
      // 2×2 block centre (in grid units) — the idle dot covers 4 cells.
      // Centre UV is the middle of the four-cell square.
      vec2 blockCenterUV = (cursorCell + 1.0) / gridSize;
      vec2 fromCenter = abs(uv - blockCenterUV) * gridSize;
      float maxDist = max(fromCenter.x, fromCenter.y);
      // Dot: 2×2 square — cells appear sequentially (top-left → top-right →
      // bottom-left → bottom-right) for a construction effect while the
      // trail fades. Each cell lags ~30ms (≈0.10 popProgress) behind the
      // previous one.
      vec2 cellOffset = gridCoord - cursorCell;
      float cellIndex = cellOffset.x + cellOffset.y * 2.0;
      float cellThreshold = cellIndex * 0.25;
      bool inDot = gridCoord.x >= cursorCell.x && gridCoord.x < cursorCell.x + 2.0
                && gridCoord.y >= cursorCell.y && gridCoord.y < cursorCell.y + 2.0
                && popProgress > cellThreshold;
      float idleAlpha = inDot ? popProgress * (sin(time * 2.0) * 0.15 + 0.85) : 0.0;

      // ── Shockwave rings — like a stone dropped in water ──
      // Ring 1 (outer): appears first, expands outward, bright.
      // Ring 2 (echo): delayed by ~1 frame, thinner, dimmer, stays inside ring 1.
      // The rings are centred on the 2×2 block: half-width = 1.0 grid cells.
      float cellEdge = 1.0;

      float ring1Expansion = (popProgress - 0.65) / 0.35;
      float ring1Outer = cellEdge + 0.10 + ring1Expansion * 0.05;
      bool inRing1 = maxDist > cellEdge && maxDist <= ring1Outer;
      float ring1Alpha = inRing1 && popProgress > 0.65 && popProgress < 1.0
        ? (1.0 - popProgress) * 3.0
        : 0.0;

      float echoGate = 0.77;
      float ring2Expansion = (popProgress - echoGate) / (1.0 - echoGate);
      float ring2Inner = cellEdge + 0.04;
      float ring2Outer = ring2Inner + 0.06 + ring2Expansion * 0.03;
      bool inRing2 = maxDist > ring2Inner && maxDist <= ring2Outer;
      float ring2Alpha = inRing2 && popProgress > echoGate && popProgress < 1.0
        ? (1.0 - popProgress) * 2.0 * (1.0 - ring2Expansion)
        : 0.0;

      float dotAlpha = idleAlpha;
      float ringAlpha = max(ring1Alpha, ring2Alpha);
      idleAlpha = max(dotAlpha, ringAlpha);

      float trailAlpha = pow(rawTrail, 0.55);
      // uArmed is 0 until the pointer has actually moved. This layer covers
      // the WHOLE viewport at z-index 99999, so before the first real pointer
      // event there is nothing legitimate to show; the trail buffer is also
      // provably all-zero at that point (see TrailBuffer), so the shader
      // outputs alpha 0 for every fragment.
      float alpha = max(trailAlpha, idleAlpha) * uArmed;

      // Ring color — lighter and more saturated than the trail, so the
      // shockwave reads as a distinct visual layer (like a white flash).
      // Only the ring gets the lighter color; the dot and trail stay teal.
      vec3 ringColor = mix(pixelColor, vec3(1.0), 0.40);
      float ringWeight = ringAlpha / max(alpha, 0.001);
      vec3 color = mix(pixelColor, ringColor, ringWeight);

      // ── PREMULTIPLIED ALPHA — the actual cause of the site-wide wash ────
      // This canvas is created with alpha:true and three defaults the context
      // to premultipliedAlpha:true, so the blend equation is
      //     framebuffer.rgb = src.rgb * 1 + dst.rgb * (1 - src.a)
      // i.e. the shader's colour is expected to ALREADY be multiplied by its
      // alpha. Writing the un-premultiplied colour (vec4(color, alpha)) added
      // full-intensity teal to EVERY fragment of the fullscreen quad — the
      // layer sits at z-index 99999, so the whole site turned flat teal as
      // soon as the layer became visible (first pointer movement). The trail
      // texture was never the culprit: it samples to 0 there, and the wash
      // measured rgb(7,168,133), exactly the raw bytes of the trail colour.
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `
);

function Scene({ gridSize, trailSize, maxAge, interpolate, easingFunction, pixelColor, paused, armed, onFirstFrame }: SceneProps) {
  const firstFrameRef = useRef(false);
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const invalidate = useThree((s) => s.invalidate);

  const cursorGridRef = useRef(new THREE.Vector2(-1, -1));

  const dotMaterial = useMemo(() => {
    const material = new DotMaterial();
    material.uniforms.pixelColor.value = new THREE.Color(pixelColor);
    // The quad is a fullscreen overlay whose whole point is its alpha channel:
    // mark it transparent so three treats it as such (correct blend pass and
    // sort) instead of as an opaque material that happens to have blending on.
    material.transparent = true;
    material.depthTest = false;
    material.depthWrite = false;
    return material;
  }, [pixelColor]);

  // `interpolate` and `easingFunction` are kept in the public props for API
  // stability: the capsule stamp below already interpolates the whole segment
  // (so fast cursor moves never leave gaps) and the falloff is linear, which
  // is the same curve drei's radial gradient used.
  void interpolate;
  void easingFunction;

  const trail = useMemo(
    () => new TrailBuffer({ size: gridSize, trailSize, maxAge }),
    [gridSize, trailSize, maxAge],
  );
  const trailRef = useRef(trail);
  trailRef.current = trail;

  // Age + upload the field on every rendered frame. With frameloop="demand"
  // this runs exactly as often as the state machine below invalidates, which
  // is 30fps while the trail fades and ~3fps once idle. Because the decay is
  // driven by frames (not by pointer events) the trail always reaches zero on
  // its own — the old canvas texture only repainted on pointer events, so it
  // froze in its last shape and held the fullscreen layer's glow open.
  const onFirstFrameRef = useRef(onFirstFrame);
  onFirstFrameRef.current = onFirstFrame;
  useFrame((_, delta) => {
    trail.update(delta);
    if (!firstFrameRef.current) {
      firstFrameRef.current = true;
      onFirstFrameRef.current();
    }
  });

  useEffect(() => () => trail.texture.dispose(), [trail]);
  useEffect(() => () => dotMaterial.dispose(), [dotMaterial]);

  // Ref-cached values the shared-ticker callback reads. Updated each render/
  // effect run so the stable callback always sees the latest values without
  // recreating itself (which would cause scheduleTick/unscheduleTick churn).
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const lastUvRef = useRef(new THREE.Vector2(0.5, 0.5));
  const lastMoveTimeRef = useRef(performance.now());
  const pendingPaintUvRef = useRef<THREE.Vector2 | null>(null);
  const dotMaterialRef = useRef<any>(null);
  dotMaterialRef.current = dotMaterial;
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  // Shared-ticker state. The stable flushPaintStable callback reads all its
  // state from refs; handleMouseMove schedules one-shot paints via the shared
  // ticker; activeTick runs every frame from the same shared ticker — zero
  // dedicated requestAnimationFrame loops for the entire site.
  const emitScheduledRef = useRef(false);
  const lastActivePaintRef = useRef(0);
  const lastIdlePaintRef = useRef(0);
  const runningRef = useRef(true);

  const flushPaintStable = useCallback(() => {
    emitScheduledRef.current = false;
    unscheduleTick(flushPaintStable);
    const uv = pendingPaintUvRef.current;
    pendingPaintUvRef.current = null;
    // Re-check paused: a paint queued just before the canvas paused (scrolled
    // off-screen) must not fire afterwards — ghost paint.
    if (!uv || pausedRef.current) return;
    lastUvRef.current.copy(uv);
    lastMoveTimeRef.current = performance.now();
    cursorGridRef.current.set(-1, -1);
    dotMaterialRef.current.uniforms.cursorGrid.value = cursorGridRef.current;
    dotMaterialRef.current.uniforms.time.value = performance.now() / 1000;
    trailRef.current.addTouch(uv);
    invalidateRef.current();
  }, []);

  // The active-tick state machine runs inside the shared rAF ticker (no
  // dedicated requestAnimationFrame). During movement, the tick invalidates
  // at 30 fps so the trail texture decays smoothly.  Once idle (1.5 s), it
  // unschedules itself and switches to a low-frequency setTimeout loop.
  useEffect(() => {
    runningRef.current = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const updateCursorGrid = (uv: THREE.Vector2) => {
      // Centre the 2×2 idle dot on the cursor. The block spans
      // [cursorCell, cursorCell+2), so its centre is cursorCell + 1.
      // Rounding (raw − 1) centres the block within ±0.5 cells of
      // the pointer — no more "snap to even" drift.
      const gx_raw = uv.x * gridSize;
      const gy_raw = uv.y * gridSize;
      cursorGridRef.current.set(
        Math.round(gx_raw - 1),
        Math.round(gy_raw - 1),
      );
      dotMaterialRef.current.uniforms.cursorGrid.value = cursorGridRef.current;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (paused) return;
      // If idling, immediately switch back to the shared ticker so the
      // fade decay and dot positioning resume without waiting for the
      // next idle timer tick (up to 300 ms).
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
        scheduleTick(activeLoop, 'PixelTrail');
      }
      const { innerWidth, innerHeight } = window;
      const maxDim = Math.max(innerWidth, innerHeight);
      const ratioX = innerWidth / maxDim;
      const ratioY = innerHeight / maxDim;
      const normalizedX = event.clientX / innerWidth;
      const normalizedY = 1 - event.clientY / innerHeight;
      if (!pendingPaintUvRef.current) pendingPaintUvRef.current = new THREE.Vector2();
      pendingPaintUvRef.current.set(
        (normalizedX - 0.5) * ratioX + 0.5,
        (normalizedY - 0.5) * ratioY + 0.5,
      );
      if (!emitScheduledRef.current) {
        emitScheduledRef.current = true;
        scheduleTick(flushPaintStable, 'PixelTrail');
      }
    };

    const DOT_DELAY_MS = 100; // delay before positioning dot after mouse stops
    const IDLE_MS = 1500;    // switch to low-freq keepalive after 1.5s of stillness
    const FADE_FPS = 30;      // invalidate at 30fps while trail decays (smooth ring shockwave)
    const IDLE_FREQ = 300;    // ~3 fps while idle

    // RAF loop: during active movement, mousemove events handle all painting.
    // After the mouse stops, we invalidate at reduced rate so the trail buffer
    // decays visually. The cross is positioned early (after 100ms of
    // stillness) so it fades in as the trail fades out — the shader hides it
    // while trail > 0.05. Once idle, switch to a low-frequency timer for the
    // breathing animation.
    const activeLoop = () => {
      if (!runningRef.current) return;
      if (paused) return;
      const now = performance.now();
      const sinceLastMove = now - lastMoveTimeRef.current;
      if (sinceLastMove < IDLE_MS) {
        // Fading: invalidate at low rate so the canvas shows trail decay.
        if (now - lastActivePaintRef.current >= (1000 / FADE_FPS)) {
          lastActivePaintRef.current = now;
          dotMaterialRef.current.uniforms.time.value = now / 1000;
          invalidateRef.current();
        }
        // Position the dot as soon as the mouse pauses — the shader
        // hides it while trail > 0.05 and reveals it with a pop
        // animation driven by the trail decay itself.
        if (sinceLastMove >= DOT_DELAY_MS && cursorGridRef.current.x === -1) {
          updateCursorGrid(lastUvRef.current);
        }
        // still scheduled — shared ticker calls us again next frame
      } else {
        unscheduleTick(activeLoop);
        startIdleKeepAlive();
      }
    };

    const startIdleKeepAlive = () => {
      const tick = () => {
        if (!runningRef.current || paused) {
          idleTimer = setTimeout(tick, IDLE_FREQ);
          return;
        }
        const now = performance.now();
        if (now - lastMoveTimeRef.current >= IDLE_MS && now - lastIdlePaintRef.current >= IDLE_FREQ) {
          lastIdlePaintRef.current = now;
          dotMaterialRef.current.uniforms.time.value = now / 1000;
          updateCursorGrid(lastUvRef.current);
          // One invalidate per idle tick: this is what ages the trail buffer
          // via useFrame. No re-stamping here — the buffer decays to zero on
          // its own, which is the signal the idle dot's pop animation waits
          // for (its comment always assumed the trail fades out here). The
          // old drei canvas only decayed when it repainted, so re-stamping
          // was needed to keep it alive; that same re-stamp also pinned a
          // permanent blob under a motionless cursor.
          invalidateRef.current();
        }
        // If mouse moved again, switch back to shared ticker
        if (now - lastMoveTimeRef.current < IDLE_MS) {
          idleTimer = null;
          scheduleTick(activeLoop, 'PixelTrail');
          return;
        }
        idleTimer = setTimeout(tick, IDLE_FREQ);
      };
      idleTimer = setTimeout(tick, IDLE_FREQ);
    };

    window.addEventListener('mousemove', handleMouseMove);
    scheduleTick(activeLoop, 'PixelTrail');

    // ── Page Visibility — pause idle timer when tab is hidden ──
    const onVisibility = () => {
      if (document.hidden) {
        // Tab hidden: clear idle timer so the ~3fps setTimeout loop stops.
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
      } else {
        // Tab visible: restart idle keep-alive if we were idling.
        if (!paused && runningRef.current) {
          const now = performance.now();
          if (now - lastMoveTimeRef.current >= IDLE_MS) {
            // No recent mouse movement — we were idling, restart it.
            startIdleKeepAlive();
          }
          // If mouse moved recently, the shared ticker is already active
          // and will resume on the next rAF tick after visibility change.
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      runningRef.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', handleMouseMove);
      unscheduleTick(activeLoop);
      if (emitScheduledRef.current) {
        emitScheduledRef.current = false;
        unscheduleTick(flushPaintStable);
      }
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [paused, gridSize, flushPaintStable]);

  // Arm gate: alpha 0 until a real pointer movement has been seen.
  useEffect(() => {
    dotMaterial.uniforms.uArmed.value = armed ? 1 : 0;
    if (!armed) trail.reset();
    invalidate();
  }, [armed, dotMaterial, invalidate, trail]);

  // ── resolution MUST be a THREE.Vector2 ────────────────────────────────
  // It used to be handed to the material as a plain [w, h] array (the
  // <primitive resolution={...}> prop below). drei's shaderMaterial defines a
  // setter per uniform that stores the raw value, so the vec2 uniform held an
  // ARRAY — and three's vec2 upload reads v.x / v.y, which arrays do not have.
  // The shader therefore received NaN, computed NaN uv for every fragment and
  // painted ONE flat colour across the fullscreen quad: the teal wash that
  // covered the whole site (this layer sits at z-index 99999) on some GPUs and
  // drivers but not others. Setting the Vector2 explicitly removes the NaN.
  useEffect(() => {
    (dotMaterial.uniforms.resolution.value as THREE.Vector2).set(
      Math.max(1, size.width * viewport.dpr),
      Math.max(1, size.height * viewport.dpr)
    );
    invalidate();
  }, [size.width, size.height, viewport.dpr, dotMaterial, invalidate]);

  const scale = Math.max(viewport.width, viewport.height) / 2;

  return (
    <mesh scale={[scale, scale, 1]}>
      <planeGeometry args={[2, 2]} />
      <primitive
        object={dotMaterial}
        gridSize={gridSize}
        mouseTrail={trail.texture}
      />
    </mesh>
  );
}

export default function PixelTrail({
  gridSize = 40,
  trailSize = 0.1,
  maxAge = 250,
  interpolate = 5,
  easingFunction = (x: number) => x,
  canvasProps = {},
  glProps = {
    antialias: false,
    powerPreference: 'high-performance',
    alpha: true,
  },
  color = '#ffffff',
  className = '',
  onReady,
}: PixelTrailProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Set by the scene on its first rendered frame; combined with `armed` below
  // to signal "the trail is really on screen" to the parent.
  const [hasRendered, setHasRendered] = useState(false);
  // Sync check — isLowEndDevice() is cached, zero-cost after first call
  const [lowEnd, setLowEnd] = useState(false);

  // ── Arm gate ─────────────────────────────────────────────────────────
  // The cursor canvas is a FULL-VIEWPORT layer at z-index 99999: whatever it
  // paints is painted over the entire site (nav, hero, modals — everything).
  // Until the pointer has actually moved there is nothing to draw, so the
  // material stays transparent (uArmed) AND the wrapper stays invisible.
  // Belt and braces on top of the zeroed trail buffer.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (armed) return;
    const arm = (e: PointerEvent) => {
      // Touch has no cursor: a finger drag must not paint a trail.
      if (e.pointerType === 'touch') return;
      setArmed(true);
    };
    // Capture phase: must run BEFORE the bubble-phase mousemove handler that
    // paints the first trail point, so the very first movement is drawn.
    window.addEventListener('pointermove', arm, true);
    return () => window.removeEventListener('pointermove', arm, true);
  }, [armed]);

  // isLowEndDevice() uses browser-only APIs — defer to client to avoid
  // hydration mismatch (same pattern as ClickSpark).
  useEffect(() => {
    setLowEnd(isLowEndDevice());
  }, []);

  // Readiness: the layer is drawing AND the visitor has actually moved the
  // pointer. Only then may the parent hide the native cursor. `onReady` is
  // called through the effect rather than a latest-value ref, so no ref is
  // read or written during render.
  useEffect(() => {
    if (armed && hasRendered) onReady?.();
  }, [armed, hasRendered, onReady]);

  // Pause when off-screen via IntersectionObserver
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleFirstFrame = useCallback(() => setHasRendered(true), []);

  if (lowEnd) return null;

  return (
    <div
      ref={wrapperRef}
      className="pixel-trail-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
        // The layer is not just transparent while unarmed, it is invisible.
        opacity: armed ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      <Canvas
        {...canvasProps}
        frameloop="demand"
        // DPR 1: the default dpr=[1,2] rendered the fullscreen cursor canvas
        // at 2× the viewport (4× the pixels) on retina displays. The trail is
        // a coarse pixel grid — retina sharpness is invisible, the GPU cost
        // is not.
        dpr={1}
        gl={{ ...glProps, alpha: true, preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          // Keep the cursor canvas transparent even when WebGL is recreated
          // after a resize or a context recovery.
          gl.setClearColor(0x000000, 0);
        }}
        className={`pixel-canvas ${className}`}
        style={{
          pointerEvents: 'none',
          background: 'transparent',
        }}
      >
        <Scene
          gridSize={gridSize}
          trailSize={trailSize}
          maxAge={maxAge}
          interpolate={interpolate}
          easingFunction={easingFunction}
          pixelColor={color}
          paused={paused}
          armed={armed}
          onFirstFrame={handleFirstFrame}
        />
      </Canvas>
    </div>
  );
}
