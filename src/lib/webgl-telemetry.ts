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
