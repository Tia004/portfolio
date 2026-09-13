'use client';

import { trackWebGLContext } from './analytics';

export type WebGLContextSource = 'dither' | 'molten';
export type WebGLContextDirection = 'lost' | 'restored';

export type WebGLContextReport = {
  source: WebGLContextSource;
  direction: WebGLContextDirection;
  statusMessage?: string;
  gpu?: string;
  vendor?: string;
  contextType?: string;
  drawingBuffer?: { width: number; height: number };
  canvasCount?: number;
  deviceMemoryGB?: number;
  dpr?: number;
  visibility?: string;
  pageVisibleMs?: number;
  jsHeapMB?: number;
};

export interface WebGLContextEventInput {
  source: WebGLContextSource;
  direction: WebGLContextDirection;
  gl?: WebGLRenderingContext | WebGL2RenderingContext | null;
  event?: Event | null;
}

// Renderer strings that mean "no GPU": Chromium's software rasteriser
// (SwiftShader), Mesa's llvmpipe/softpipe and Windows' "Microsoft Basic
// Render Driver". A full-screen shader on these runs at a few frames per
// second (the site freezes) and their fragment precision/approximations can
// blow the output up to a flat saturated field (the "green wash"). Detecting
// them lets the background components skip WebGL entirely and use the static
// layer instead — same look, no freeze.
const SOFTWARE_RENDERER_PATTERNS = [
  'swiftshader',
  'software',
  'llvmpipe',
  'softpipe',
  'basic render driver',
  'microsoft basic',
  'mesa offscreen',
];

export function isSoftwareRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null | undefined
): boolean {
  if (!gl) return true;
  try {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debug) return false; // extension hidden — assume real hardware
    const renderer = String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
    if (!renderer) return false;
    return SOFTWARE_RENDERER_PATTERNS.some((pattern) => renderer.includes(pattern));
  } catch {
    return false;
  }
}

function asContextEvent(event?: Event | null): WebGLContextEvent | null {
  if (!event) return null;
  const evt = event as WebGLContextEvent;
  return typeof evt.statusMessage === 'string' ? evt : null;
}

export function collectWebGLDiagnostics(input: WebGLContextEventInput): WebGLContextReport {
  const report: WebGLContextReport = { source: input.source, direction: input.direction };

  // `statusMessage` is the closest thing browsers expose to a "why" — e.g.
  // Chrome reports "Context lost" or GPU-reset reasons here (often empty).
  const evt = asContextEvent(input.event);
  if (evt && evt.statusMessage) report.statusMessage = evt.statusMessage;

  const gl = input.gl;
  if (gl) {
    try {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      if (debug) {
        report.gpu = String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
        report.vendor = String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL));
      }
    } catch {
      // extension missing or context already lost — not worth surfacing
    }
    try {
      const version = String(gl.getParameter(gl.VERSION));
      report.contextType = version.indexOf('WebGL 2') === 0 ? 'webgl2' : 'webgl';
      report.drawingBuffer = { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight };
    } catch {
      // context lost — drawing buffer size unavailable
    }
  }

  try {
    report.canvasCount = document.querySelectorAll('canvas').length;
    report.dpr = window.devicePixelRatio || 1;
    report.visibility = document.visibilityState;
    report.pageVisibleMs = Math.round(performance.now());
  } catch {
    // SSR guard — never reached in practice
  }

  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (typeof nav.deviceMemory === 'number') report.deviceMemoryGB = nav.deviceMemory;
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (perf.memory && typeof perf.memory.usedJSHeapSize === 'number') {
      report.jsHeapMB = Math.round(perf.memory.usedJSHeapSize / 1048576);
    }
  } catch {
    // optional diagnostics — non-fatal
  }

  return report;
}

export function reportWebGLContext(input: WebGLContextEventInput): void {
  const report = collectWebGLDiagnostics(input);
  const label = `[webgl:${report.source}] context ${report.direction}`;
  if (report.direction === 'lost') {
    // eslint-disable-next-line no-console
    console.warn(label, report);
  } else {
    // eslint-disable-next-line no-console
    console.info(label, report);
  }
  // Persistent telemetry (respects cookie consent) — correlates the recurring
  // "TV static" symptom with the GPU/driver/memory conditions on real devices.
  trackWebGLContext(report);
}
