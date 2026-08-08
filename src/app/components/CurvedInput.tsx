'use client';

import { useId, useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { ArrowTurnDownIcon } from '@hugeicons/core-free-icons';
import './CurvedInput.css';

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface Geometry {
  straight: boolean;
  W: number;
  T: number;
  svgH: number;
  R?: number;
  dir?: number;
  uPerLen: number;
  point: (u: number, v: number) => [number, number];
  angleAt: (u: number) => number;
}

const buildGeometry = (width: number, bend: number, thickness: number, pad: number): Geometry => {
  const W = width;
  const T = thickness;
  const s = Math.max(-W * 0.35, Math.min(bend, W * 0.35));
  const a = Math.abs(s);
  const dir = s >= 0 ? 1 : -1;
  const svgH = T + a + pad * 2;

  if (a < 0.75) {
    const midY = pad + T / 2;
    return { straight: true, W, T, svgH, uPerLen: 1, point: (u, v) => [u, midY + v], angleAt: () => 0 };
  }

  const R = (W * W * 0.25 + a * a) / (2 * a);
  const cx = W / 2;
  const apexY = pad + T / 2 + (dir > 0 ? 0 : a);
  const cy = apexY + dir * R;
  const phi = Math.asin(Math.min(1, W / (2 * R)));

  return {
    straight: false, W, T, svgH, R, dir,
    uPerLen: W / (2 * R * phi),
    point: (u, v) => {
      const th = ((u - cx) / cx) * phi;
      const rho = R - dir * v;
      return [cx + rho * Math.sin(th), cy - dir * rho * Math.cos(th)];
    },
    angleAt: u => dir * ((u - cx) / cx) * phi * (180 / Math.PI),
  };
};

const fmt = (g: Geometry, u: number, v: number): string => {
  const [x, y] = g.point(u, v);
  return `${round2(x)} ${round2(y)}`;
};

const edgeSeg = (g: Geometry, uTo: number, v: number, ltr: boolean): string => {
  if (g.straight) return `L ${fmt(g, uTo, v)}`;
  const rho = round2(g.R! - g.dir! * v);
  const sweep = ltr === g.dir! > 0 ? 1 : 0;
  return `A ${rho} ${rho} 0 0 ${sweep} ${fmt(g, uTo, v)}`;
};

const bentRectPath = (g: Geometry, u0: number, u1: number, vTop: number, vBot: number, radius: number): string => {
  const rc = Math.max(0, Math.min(radius, (vBot - vTop) / 2, (u1 - u0) / 2));
  return [
    `M ${fmt(g, u0 + rc, vTop)}`,
    edgeSeg(g, u1 - rc, vTop, true),
    `Q ${fmt(g, u1, vTop)} ${fmt(g, u1, vTop + rc)}`,
    `L ${fmt(g, u1, vBot - rc)}`,
    `Q ${fmt(g, u1, vBot)} ${fmt(g, u1 - rc, vBot)}`,
    edgeSeg(g, u0 + rc, vBot, false),
    `Q ${fmt(g, u0, vBot)} ${fmt(g, u0, vBot - rc)}`,
    `L ${fmt(g, u0, vTop + rc)}`,
    `Q ${fmt(g, u0, vTop)} ${fmt(g, u0 + rc, vTop)}`,
    'Z'
  ].join(' ');
};

const bentLinePath = (g: Geometry, u0: number, u1: number, v: number): string =>
  `M ${fmt(g, u0, v)} ${edgeSeg(g, u1, v, true)}`;

// ── Render icon paths from a hugeicons IconSvgObject ──────
function renderIconPaths(icon: unknown, keyPrefix: string, color: string, strokeWidth: number, size: number) {
  const paths = icon as Array<[string, Record<string, unknown>]>;
  if (!Array.isArray(paths)) return null;
  // ViewBox is 24x24, scale to requested size
  const scale = size / 24;
  return paths.map(([tag, attrs], i) => {
    if (tag !== 'path') return null;
    const { d, stroke, strokeLinecap, strokeLinejoin } = attrs as Record<string, string>;
    return (
      <path
        key={`${keyPrefix}-${i}`}
        d={d as string}
        stroke={stroke === 'currentColor' ? color : (stroke as string)}
        strokeWidth={(strokeWidth * scale)}
        strokeLinecap={strokeLinecap as 'round' | 'butt' | 'square'}
        strokeLinejoin={strokeLinejoin as 'round' | 'miter' | 'bevel'}
        fill="none"
      />
    );
  });
}

// ── Filled sparkle path (single 5-pointed star, solid fill) ──────
const SPARKLE_PATH = 'M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z';

export interface CurvedInputProps {
  label?: string;
  showSparkle?: boolean;
  suffix?: ReactNode;
  width?: number;
  bend?: number;
  height?: number;
  cornerRadius?: number;
  borderWidth?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  arrowColor?: string;
  arrowUp?: boolean;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

const CurvedInput = ({
  label = '',
  showSparkle = true,
  suffix,
  width = 360,
  bend = 14,
  height = 48,
  cornerRadius = 24,
  borderWidth = 1.5,
  fontSize = 14,
  backgroundColor = '#ffffff08',
  textColor = '#ffffff',
  borderColor = '#ffffff15',
  arrowColor = '#ffffff66',
  arrowUp = false,
  tooltip,
  onClick,
  className = '',
}: CurvedInputProps) => {
  const uid = useId().replace(/:/g, '');
  const labelPathId = `cb-label-${uid}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setW(Math.round(entries[0]?.contentRect?.width ?? el.clientWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = Math.ceil(borderWidth / 2) + 6;
  const geom = useMemo(() => (w > 2 ? buildGeometry(w, bend, height, pad) : null), [w, bend, height, pad]);

  if (!geom) {
    return <div ref={rootRef} className={`curved-btn ${className}`.trim()} style={{ width: `${width}px` }} />;
  }

  const T = height;
  const vBase = fontSize * 0.34;
  const bandPath = bentRectPath(geom, 0, geom.W, -T / 2, T / 2, cornerRadius);

  // Layout: sparkle icon → label text → arrow (right edge)
  const labelStart = showSparkle ? 38 : 18;
  const labelEnd = geom.W - 38;
  const labelPath = bentLinePath(geom, labelStart, labelEnd, vBase);

  // Sparkle — filled star, positioned at the visual centre of the
  // text line. Mixed-case Outfit text has its visual midpoint at
  // ~vBase - fontSize*0.35. The star centre is at (12,9) in a 24×24
  // viewBox, so we add size/8 to compensate for its off-centre geometry.
  const sparkleU = 18; // padded from the left edge
  const sparkleSize = fontSize + 8;
  const sparkleV = vBase - fontSize * 0.35 + sparkleSize / 8;
  const [sparkleX, sparkleY] = geom.point(sparkleU, sparkleV);
  const sparkleAngle = geom.angleAt(sparkleU);

  // Arrow position — centered in bar (v=0), rotated to follow curve + extra downward tilt
  const arrowU = geom.W - 24;
  const arrowAt = geom.angleAt(arrowU);
  const [arrowX, arrowY] = geom.point(arrowU, 0);
  const arrowSize = 20;
  const arrowExtraTilt = 20; // extra degrees clockwise to emphasize "scroll down" // extra degrees clockwise to emphasize "scroll down"

  return (
    <div
      ref={rootRef}
      className={`curved-btn ${className}`.trim()}
      style={{ width: `${width}px`, position: 'relative' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      onMouseEnter={() => {
        if (tooltip && !tooltipVisible) {
          tooltipTimerRef.current = setTimeout(() => setTooltipVisible(true), 300);
        }
      }}
      onMouseLeave={() => {
        if (tooltipTimerRef.current) {
          clearTimeout(tooltipTimerRef.current);
          tooltipTimerRef.current = null;
        }
        setTooltipVisible(false);
      }}
    >
      {/* Backdrop-blur layer — clipped to exact curved-bar shape via bandPath */}
      <div
        className="absolute inset-0 backdrop-blur-sm pointer-events-none"
        style={{
          zIndex: -1,
          clipPath: `path("${bandPath}")`,
        }}
      />

      {tooltip && tooltipVisible && (
        <div className={arrowUp
          ? 'absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] text-white text-xs shadow-lg shadow-black/40 pointer-events-none z-10 animate-in fade-in zoom-in-95 duration-200'
          : 'absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] text-white text-xs shadow-lg shadow-black/40 pointer-events-none z-10 animate-in fade-in zoom-in-95 duration-200'
        }
          style={arrowUp ? { top: 'calc(100% + 8px)' } : undefined}
        >
          {tooltip}
          {/* Arrow pointing toward the button */}
          <div className={arrowUp
            ? 'absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/[0.08] border-l border-t border-white/[0.10] rotate-45'
            : 'absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/[0.08] border-r border-b border-white/[0.10] rotate-45'
          } />
        </div>
      )}
      <svg
        className="curved-btn__svg"
        width={geom.W}
        height={round2(geom.svgH)}
        viewBox={`0 0 ${geom.W} ${round2(geom.svgH)}`}
        aria-hidden="true"
      >
        {/* SVG filters — none currently, kept for future use */}
        <defs />

        {/* Background bar */}
        <path d={bandPath} fill={backgroundColor} stroke={borderColor} strokeWidth={borderWidth} />

        {/* Filled sparkle star — positioned on the same curve as the
             text so it reads as part of the label. */}
        {showSparkle && (
          <g
            key={arrowUp ? 'sparkle-up' : 'sparkle-down'}
            className="curved-btn__sparkle"
            transform={`translate(${round2(sparkleX)}, ${round2(sparkleY)}) rotate(${round2(sparkleAngle)}) translate(${round2(-sparkleSize / 2)}, ${round2(-sparkleSize / 2)}) scale(${round2(sparkleSize / 24)})`}
          >
            <path d={SPARKLE_PATH} fill={textColor} />
          </g>
        )}

        {/* Label text on the curve */}
        {label && (
          <>
            <path id={labelPathId} d={labelPath} fill="none" />
            <text fill={textColor} style={{ fontSize: `${fontSize}px`, fontWeight: 500 }}>
              <textPath href={`#${labelPathId}`} startOffset="0">{label}</textPath>
            </text>
          </>
        )}

        {/* ArrowTurnDown stays on the same curved path; only its own square
            icon rotates so it remains inside the button when pointing back up. */}
        {suffix !== undefined ? suffix : (
          <g transform={`translate(${round2(arrowX)}, ${round2(arrowY)}) rotate(${round2(arrowAt + arrowExtraTilt)}) translate(${round2(-arrowSize / 2)}, ${round2(-arrowSize / 2)})`}>
            <g className={`curved-btn__arrow ${arrowUp ? 'curved-btn__arrow--up' : ''}`}>
              {renderIconPaths(ArrowTurnDownIcon, 'cb-arrow', arrowColor, 1.5, arrowSize)}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

export default CurvedInput;
