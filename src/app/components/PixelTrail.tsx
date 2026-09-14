'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, CanvasProps, ThreeEvent } from '@react-three/fiber';
import { shaderMaterial, useTrailTexture } from '@react-three/drei';
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
}

interface PixelTrailProps {
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

const DotMaterial = shaderMaterial(
  {
    resolution: new THREE.Vector2(),
    mouseTrail: null,
    gridSize: 100,
    pixelColor: new THREE.Color('#ffffff'),
    cursorGrid: new THREE.Vector2(-1, -1),
    time: 0,
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

    vec2 coverUv(vec2 uv) {
      vec2 s = resolution.xy / max(resolution.x, resolution.y);
      vec2 newUv = (uv - 0.5) * s + 0.5;
      return clamp(newUv, 0.0, 1.0);
    }

    void main() {
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
      float alpha = max(trailAlpha, idleAlpha);

      // Ring color — lighter and more saturated than the trail, so the
      // shockwave reads as a distinct visual layer (like a white flash).
      // Only the ring gets the lighter color; the dot and trail stay teal.
      vec3 ringColor = mix(pixelColor, vec3(1.0), 0.40);
      float ringWeight = ringAlpha / max(alpha, 0.001);
      vec3 color = mix(pixelColor, ringColor, ringWeight);

      gl_FragColor = vec4(color, alpha);
    }
  `
);

function Scene({ gridSize, trailSize, maxAge, interpolate, easingFunction, pixelColor, paused }: SceneProps) {
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const invalidate = useThree((s) => s.invalidate);

  const cursorGridRef = useRef(new THREE.Vector2(-1, -1));

  const dotMaterial = useMemo(() => {
    const material = new DotMaterial();
    material.uniforms.pixelColor.value = new THREE.Color(pixelColor);
    return material;
  }, [pixelColor]);

  const [trail, onMove] = useTrailTexture({
    size: 512,
    radius: trailSize,
    maxAge: maxAge,
    interpolate: interpolate || 0.1,
    ease: easingFunction || ((x: number) => x),
  }) as [THREE.Texture | null, (e: ThreeEvent<PointerEvent>) => void];

  // Ref-cached values the shared-ticker callback reads. Updated each render/
  // effect run so the stable callback always sees the latest values without
  // recreating itself (which would cause scheduleTick/unscheduleTick churn).
  // Placed after dotMaterial and trail declarations to avoid TDZ.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const trailRef = useRef<THREE.Texture | null>(null);
  trailRef.current = trail;
  const lastUvRef = useRef(new THREE.Vector2(0.5, 0.5));
  const lastMoveTimeRef = useRef(performance.now());
  const pendingPaintUvRef = useRef<THREE.Vector2 | null>(null);
  const dotMaterialRef = useRef<any>(null);
  dotMaterialRef.current = dotMaterial;
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  // Stabilize onMove: useTrailTexture returns a new callback reference every
  // render. Storing the latest in a ref prevents the main RAF-loop effect from
  // restarting on every mouse move (which would trigger invalidate → re-render
  // → new onMove → effect cleanup → loop). Direct render-body assignment is
  // the idiomatic React 18+ pattern for "latest value refs."
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const emptyTrailTexture = useMemo(() => {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Pixel trail: nearest filtering keeps the dots crisp and blocky.
  // Must be applied once the trail texture is created by useTrailTexture.
  useEffect(() => {
    if (!trail) return;
    // eslint-disable-next-line react-hooks/immutability -- configuring a Three.js texture returned by a hook
    trail.minFilter = THREE.NearestFilter;
    trail.magFilter = THREE.NearestFilter;
    trail.wrapS = THREE.ClampToEdgeWrapping;
    trail.wrapT = THREE.ClampToEdgeWrapping;
  }, [trail]);

  useEffect(() => () => emptyTrailTexture.dispose(), [emptyTrailTexture]);
  useEffect(() => () => dotMaterial.dispose(), [dotMaterial]);

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
    // Re-check paused/trail: a paint queued just before the canvas paused
    // (scrolled off-screen) must not fire afterwards — ghost paint.
    if (!uv || pausedRef.current || !trailRef.current) return;
    lastUvRef.current.copy(uv);
    lastMoveTimeRef.current = performance.now();
    cursorGridRef.current.set(-1, -1);
    dotMaterialRef.current.uniforms.cursorGrid.value = cursorGridRef.current;
    dotMaterialRef.current.uniforms.time.value = performance.now() / 1000;
    onMoveRef.current({ uv } as unknown as ThreeEvent<PointerEvent>);
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
      if (paused || !trail) return;
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
    // After the mouse stops, we invalidate at reduced rate so the trail texture
    // decays visually. No manual repaint — useTrailTexture's maxAge handles it.
    // The cross is positioned early (after 100ms of stillness) so it fades in
    // as the trail fades out — the shader hides it while trail > 0.05.
    // Once idle, switch to a low-frequency timer for the breathing animation.
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
        if (!runningRef.current || paused || !trail) {
          idleTimer = setTimeout(tick, IDLE_FREQ);
          return;
        }
        const now = performance.now();
        if (now - lastMoveTimeRef.current >= IDLE_MS && now - lastIdlePaintRef.current >= IDLE_FREQ) {
          lastIdlePaintRef.current = now;
          dotMaterialRef.current.uniforms.time.value = now / 1000;
          updateCursorGrid(lastUvRef.current);
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
        if (!paused && trail && runningRef.current) {
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
  }, [paused, trail]);

  const scale = Math.max(viewport.width, viewport.height) / 2;

  return (
    <mesh scale={[scale, scale, 1]}>
      <planeGeometry args={[2, 2]} />
      <primitive
        object={dotMaterial}
        gridSize={gridSize}
        resolution={[size.width * viewport.dpr, size.height * viewport.dpr]}
        mouseTrail={trail ?? emptyTrailTexture}
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
}: PixelTrailProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Sync check — isLowEndDevice() is cached, zero-cost after first call
  const [lowEnd, setLowEnd] = useState(false);

  // isLowEndDevice() uses browser-only APIs — defer to client to avoid
  // hydration mismatch (same pattern as ClickSpark).
  useEffect(() => {
    setLowEnd(isLowEndDevice());
  }, []);

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
        />
      </Canvas>
    </div>
  );
}
