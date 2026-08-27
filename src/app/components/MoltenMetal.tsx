'use client';

import { useEffect, useRef } from 'react';
import { reportWebGLContext } from '@/lib/webgl-telemetry';

export type MoltenMetalColorMode = 'molten' | 'ember' | 'frost';

export interface MoltenMetalProps {
  /** Fired once, right after the shader program is built (compiled + linked)
   *  and the first frame is sized — i.e. the background is "loaded" and can
   *  render on demand the moment the user scrolls into the transparent
   *  sections. The splash screen waits for this (bounded) before exiting. */
  onReady?: () => void;
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  scale?: number;
  detail?: number;
  glow?: number;
  coreSize?: number;
  swirl?: number;
  fold?: number;
  blackPoint?: number;
  brightness?: number;
  colorMode?: MoltenMetalColorMode;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  opacity?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

const colorModeToFloat = (mode: MoltenMetalColorMode): number =>
  mode === 'ember' ? 1 : mode === 'frost' ? 2 : 0;

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uCoreSize;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uColorMode;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform bool uEnableMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

// High-frequency pseudo-random noise without trigonometric aliasing (no diagonal striping/banding)
float hash(vec2 p) {
  vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(p, magic.xy)));
}

void main() {
  float time = iTime * uSpeed;
  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;

  vec2 drift = vec2(0.0);
  if (uEnableMouse) {
    drift = (uMouse - 0.5) * uMouseStrength * 2.0;
  }
  p += drift;

  vec2 i = p;
  float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;

  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float glowCore = uGlow * uCoreSize;

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= uDetail) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }

  c /= 6.0;

  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;

  float g = clamp(intensity, 0.0, 1.0);

  float mid = 0.5;
  if (uColorMode > 1.5) {
    mid = 0.65;
  } else if (uColorMode > 0.5) {
    mid = 0.35;
  }

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, mid, g));
  col = mix(col, uColor3, smoothstep(mid, 1.0, g));

  float a = g;
  if (uGrain > 0.5) {
    float gr = hash(gl_FragCoord.xy + iTime);
    a += (gr - 0.5) * uGrainIntensity;
  }
  a = clamp(a, 0.0, 1.0) * uOpacity;
  fragColor = vec4(col * a, a);
}
`;

interface MoltenMetalCtx {
  gl: WebGL2RenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const ctxMap = new WeakMap<HTMLDivElement, MoltenMetalCtx>();

interface UniformProps {
  color1: string;
  color2: string;
  color3: string;
  speed: number;
  scale: number;
  detail: number;
  glow: number;
  coreSize: number;
  swirl: number;
  fold: number;
  blackPoint: number;
  brightness: number;
  colorMode: MoltenMetalColorMode;
  grain: boolean;
  grainIntensity: number;
  mouseInteraction: boolean;
  mouseStrength: number;
  opacity: number;
}

function writeUniforms(ctx: MoltenMetalCtx, p: UniformProps) {
  const { gl, uniforms } = ctx;
  const c1 = hexToRgb(p.color1);
  const c2 = hexToRgb(p.color2);
  const c3 = hexToRgb(p.color3);
  gl.uniform3f(uniforms.uColor1, c1[0], c1[1], c1[2]);
  gl.uniform3f(uniforms.uColor2, c2[0], c2[1], c2[2]);
  gl.uniform3f(uniforms.uColor3, c3[0], c3[1], c3[2]);
  gl.uniform1f(uniforms.uSpeed, p.speed);
  gl.uniform1f(uniforms.uScale, p.scale);
  gl.uniform1f(uniforms.uDetail, p.detail);
  gl.uniform1f(uniforms.uGlow, p.glow);
  gl.uniform1f(uniforms.uCoreSize, Math.max(p.coreSize, 0.001));
  gl.uniform1f(uniforms.uSwirl, p.swirl);
  gl.uniform1f(uniforms.uFold, p.fold);
  gl.uniform1f(uniforms.uBlackPoint, p.blackPoint);
  gl.uniform1f(uniforms.uBrightness, p.brightness);
  gl.uniform1f(uniforms.uColorMode, colorModeToFloat(p.colorMode));
  gl.uniform1f(uniforms.uGrain, p.grain ? 1 : 0);
  gl.uniform1f(uniforms.uGrainIntensity, p.grainIntensity);
  gl.uniform1f(uniforms.uOpacity, p.opacity);
  gl.uniform1f(uniforms.uMouseStrength, p.mouseStrength);
  gl.uniform1i(uniforms.uEnableMouse, p.mouseInteraction ? 1 : 0);
}

// Builds (and links) the shader program + fullscreen triangle + uniform
// handles. Extracted so it can run both on mount and after a
// `webglcontextrestored` event — every GL resource dies with a lost context
// and must be rebuilt before rendering resumes.
function buildResources(
  gl: WebGL2RenderingContext
): { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> } | null {
  const compile = (type: number, src: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Fullscreen triangle (no VBO needed — three vertices cover the clip space).
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms: Record<string, WebGLUniformLocation | null> = {
    iTime: u('iTime'),
    iResolution: u('iResolution'),
    uSpeed: u('uSpeed'),
    uScale: u('uScale'),
    uDetail: u('uDetail'),
    uGlow: u('uGlow'),
    uCoreSize: u('uCoreSize'),
    uSwirl: u('uSwirl'),
    uFold: u('uFold'),
    uBlackPoint: u('uBlackPoint'),
    uBrightness: u('uBrightness'),
    uColorMode: u('uColorMode'),
    uGrain: u('uGrain'),
    uGrainIntensity: u('uGrainIntensity'),
    uOpacity: u('uOpacity'),
    uMouse: u('uMouse'),
    uMouseStrength: u('uMouseStrength'),
    uEnableMouse: u('uEnableMouse'),
    uColor1: u('uColor1'),
    uColor2: u('uColor2'),
    uColor3: u('uColor3'),
  };

  return { program, uniforms };
}

export default function MoltenMetal({
  onReady,
  color1 = '#5227FF',
  color2 = '#FF9FFC',
  color3 = '#FFFFFF',
  speed = 0.35,
  scale = 4,
  detail = 3,
  glow = 1.6,
  coreSize = 0.1,
  swirl = 1,
  fold = -0.2,
  blackPoint = 0.05,
  brightness = 1.3,
  colorMode = 'molten',
  grain = false,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseStrength = 0.3,
  opacity = 1.0,
  className = '',
}: MoltenMetalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const signalReady = () => {
      if (readyFiredRef.current) return;
      readyFiredRef.current = true;
      (window as Window & { __tiaMoltenReady?: boolean }).__tiaMoltenReady = true;
      window.dispatchEvent(new Event('tia:molten-ready'));
      onReadyRef.current?.();
    };

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    }) as WebGL2RenderingContext | null;

    if (!gl) {
      // No WebGL2 — the CSS fallback is already visible. Resolve the splash
      // immediately instead of waiting for a canvas that can never compile.
      container.removeChild(canvas);
      signalReady();
      return;
    }

    const resources = buildResources(gl);
    if (!resources) {
      // Shader compilation failed: keep the CSS fallback and do not pin the
      // loading screen behind an impossible WebGL resource.
      container.removeChild(canvas);
      signalReady();
      return;
    }

    const ctx: MoltenMetalCtx = { gl, uniforms: resources.uniforms };
    ctxMap.set(container, ctx);

    const props: UniformProps = {
      color1, color2, color3, speed, scale, detail, glow, coreSize, swirl, fold,
      blackPoint, brightness, colorMode, grain, grainIntensity,
      mouseInteraction, mouseStrength, opacity,
    };

    writeUniforms(ctx, props);

    // DPR 1 everywhere — the full-screen shader is the single largest GPU
    // consumer on the site. The 0.75×/0.5× downscale was tried as a perf lever
    // but aliased: the shader's thin diagonal filaments (the 1/length(sin,cos)
    // spikes in the domain warp) became chunky oblique watermark lines when
    // the buffer was stretched back to 100% CSS size. Full 1.0× matches the
    // reactbits reference; the 30fps cap + DPR 1 still keep GPU work well
    // below the original DPR 1.5 @ 60fps. Grain is dropped on mobile only (the
    // per-pixel hash costs more on phones and the lower screen makes it
    // noisier).
    let isMobile = false;
    const setSize = () => {
      const rect = container.getBoundingClientRect();
      isMobile =
        (window.matchMedia?.('(pointer: coarse)').matches ?? false) ||
        rect.width < 768;
      const dpr = 1;
      const scale = 1;
      const w = Math.max(1, Math.floor(rect.width * dpr * scale));
      const h = Math.max(1, Math.floor(rect.height * dpr * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(ctx.uniforms.iResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform1f(ctx.uniforms.uGrain, isMobile ? 0 : (props.grain ? 1 : 0));
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    // Compile/link alone is not enough: a transparent canvas can still show
    // through for one frame while its viewport and resolution are unset.
    // Draw one real frame before resolving the splash so the molten is visible
    // immediately when the loading screen fades.
    gl.uniform1f(ctx.uniforms.iTime, 0);
    gl.uniform2f(ctx.uniforms.uMouse, 0.5, 0.5);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    signalReady();

    // Mouse (the shader only uses it when uEnableMouse is true).
    const targetMouse: [number, number] = [0.5, 0.5];
    const currentMouse: [number, number] = [0.5, 0.5];
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      targetMouse[0] = (e.clientX - r.left) / Math.max(1, r.width);
      targetMouse[1] = 1.0 - (e.clientY - r.top) / Math.max(1, r.height);
    };
    const onLeave = () => {
      targetMouse[0] = 0.5;
      targetMouse[1] = 0.5;
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    // Animation loop, gated by page visibility + hero/footer coverage so the
    // fixed shader never burns GPU while an opaque section hides it.
    let raf = 0;
    let pageVisible = !document.hidden;
    let covered = false;
    let contextLost = false;
    let frameCount = 0;
    let lastFrameAt = performance.now();
    const t0 = performance.now();

    const render = (t: number) => {
      lastFrameAt = t;
      // FPS cap: render every other rAF (~30fps) on all devices. The slow
      // molten drift stays fluid at half the GPU work; the per-frame cost
      // (full-screen shader) is the dominant GPU consumer site-wide.
      frameCount++;
      if (frameCount % 2 === 0) {
        raf = requestAnimationFrame(render);
        return;
      }
      gl.uniform1f(ctx.uniforms.iTime, (t - t0) * 0.001);
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      gl.uniform2f(ctx.uniforms.uMouse, currentMouse[0], currentMouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };

    const tryStart = () => {
      if (pageVisible && !covered && !contextLost && raf === 0) raf = requestAnimationFrame(render);
    };
    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    // Hero/footer coverage pause: the fixed shader pauses ONLY when the
    // viewport center is inside an opaque cover (hero or footer). This saves
    // GPU when the molten is invisible anyway. scrollInput is NOT paused —
    // the molten must animate continuously during scroll; a freeze+restart
    // on every wheel event reads as a visual glitch.
    const updateCoverage = () => {
      const vh = window.innerHeight || 1;
      const covers = Array.from(document.querySelectorAll<HTMLElement>('[data-molten-cover]'));
      const center = vh * 0.5;
      const next = covers.some((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top <= center && rect.bottom >= center;
      });
      if (next !== covered) {
        covered = next;
        if (covered) tryStop();
        else tryStart();
      }
    };
    window.addEventListener('scroll', updateCoverage, { passive: true });
    window.addEventListener('resize', updateCoverage, { passive: true });
    // Lazy sections mount as the user scrolls, growing the document and
    // shifting the hero/footer covers — re-evaluate coverage then too, or a
    // stale `covered=true` could leave the molten paused forever behind the
    // transparent sections ("the background disappeared").
    window.addEventListener('tia:section-mounted', updateCoverage);
    window.addEventListener('tia:force-mount', updateCoverage);
    updateCoverage();

    // Watchdog: if the loop SHOULD be running but hasn't drawn a frame in 3s
    // (browser quirk killed the rAF chain, a visibilitychange was missed, or a
    // context-restore rebuild silently failed), force a restart so the molten
    // can never permanently disappear. Two cheap getBoundingClientRect calls
    // every 2.5s — negligible.
    const watchdog = window.setInterval(() => {
      if (document.hidden || covered || contextLost) return; // intentionally paused
      if (raf === 0) {
        tryStart();
        return;
      }
      if (performance.now() - lastFrameAt > 3000) {
        tryStop();
        tryStart();
      }
    }, 2500);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // WebGL context loss/restore: report WHEN + WHY (GPU/driver/memory) so a
    // recurring freeze can be correlated. preventDefault on loss keeps the
    // context restorable; on restore we rebuild the program/buffer (all GL
    // resources die with the context) and resume rendering.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      tryStop();
      reportWebGLContext({ source: 'molten', direction: 'lost', gl, event: e });
    };
    const onContextRestored = (e: Event) => {
      contextLost = false;
      const rebuilt = buildResources(gl);
      if (rebuilt) {
        ctx.uniforms = rebuilt.uniforms;
        writeUniforms(ctx, props);
        setSize();
      }
      reportWebGLContext({ source: 'molten', direction: 'restored', gl, event: e });
      tryStart();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      window.clearInterval(watchdog);
      window.removeEventListener('scroll', updateCoverage);
      window.removeEventListener('resize', updateCoverage);
      window.removeEventListener('tia:section-mounted', updateCoverage);
      window.removeEventListener('tia:force-mount', updateCoverage);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      ctxMap.delete(container);
      try {
        container.removeChild(canvas);
      } catch {
        /* already removed */
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = ctxMap.get(container);
    if (!ctx) return;
    writeUniforms(ctx, {
      color1, color2, color3, speed, scale, detail, glow, coreSize, swirl, fold,
      blackPoint, brightness, colorMode, grain, grainIntensity,
      mouseInteraction, mouseStrength, opacity,
    });
  }, [
    color1, color2, color3, speed, scale, detail, glow, coreSize, swirl, fold,
    blackPoint, brightness, colorMode, grain, grainIntensity,
    mouseInteraction, mouseStrength, opacity,
  ]);

  return <div ref={containerRef} className={`molten-metal-container ${className}`.trim()} />;
}
