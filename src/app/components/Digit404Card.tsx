'use client';

import React, { useRef, useState, useId } from 'react';

interface Digit404CardProps {
  digit: '4' | '0';
  index: number;
}

// Clean, mathematically defined geometric contours without overlapping segments
const PATH_4 =
  'M 82 20 L 114 20 L 114 114 L 128 114 L 128 138 L 114 138 L 114 158 L 82 158 L 82 138 L 12 138 L 12 116 L 82 34 Z M 82 60 L 82 114 L 42 114 Z';

const PATH_0 =
  'M 70 20 C 100 20 122 44 122 89 C 122 134 100 158 70 158 C 40 158 18 134 18 89 C 18 44 40 20 70 20 Z M 70 52 C 84 52 94 66 94 89 C 94 112 84 126 70 126 C 56 126 46 112 46 89 C 46 66 56 52 70 52 Z';

export default function Digit404Card({ digit, index }: Digit404CardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 70, y: 90 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reactId = useId().replace(/:/g, '_');
  const clipId = `clip-digit-${digit}-${index}-${reactId}`;
  const blurId = `blur-glow-${digit}-${index}-${reactId}`;
  const beamId = `beam-${digit}-${index}-${reactId}`;
  const borderBeamId = `border-beam-${digit}-${index}-${reactId}`;
  const sheenId = `sheen-${digit}-${index}-${reactId}`;

  const digitPath = digit === '4' ? PATH_4 : PATH_0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x: (x / rect.width) * 140, y: (y / rect.height) * 180 });

    const normX = x / rect.width - 0.5;
    const normY = y / rect.height - 0.5;
    setTilt({ x: normX * 14, y: normY * -14 });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 70, y: 90 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-pointer select-none group transform-gpu"
      style={{
        transform: isHovered
          ? `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(1.06, 1.06, 1.06)`
          : 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <svg
        viewBox="0 0 140 180"
        className="w-20 h-28 sm:w-28 sm:h-38 md:w-36 md:h-48 overflow-visible drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
        aria-hidden="true"
      >
        <defs>
          {/* Clip path outlining the exact silhouette of the digit */}
          <clipPath id={clipId}>
            <path d={digitPath} fillRule="evenodd" />
          </clipPath>

          {/* Ambient BorderGlow filter */}
          <filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={isHovered ? 10 : 5} />
          </filter>

          {/* Dynamic spotlight beam following cursor inside the digit */}
          <radialGradient id={beamId} cx={mousePos.x} cy={mousePos.y} r="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={isHovered ? 0.7 : 0.2} />
            <stop offset="50%" stopColor="#0d9488" stopOpacity={isHovered ? 0.35 : 0.06} />
            <stop offset="100%" stopColor="#081410" stopOpacity="0" />
          </radialGradient>

          {/* Dynamic travelling border beam following cursor along the contour */}
          <radialGradient id={borderBeamId} cx={mousePos.x} cy={mousePos.y} r="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5eead4" stopOpacity={isHovered ? 1 : 0.65} />
            <stop offset="45%" stopColor="#2dd4bf" stopOpacity={isHovered ? 0.6 : 0.25} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </radialGradient>

          {/* Liquid glass top sheen like chatbot bar */}
          <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#2dd4bf" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── 1. Outer Ambient BorderGlow on the exact contour ── */}
        <path
          d={digitPath}
          fill="none"
          fillRule="evenodd"
          stroke="#2dd4bf"
          strokeWidth={isHovered ? 14 : 6}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#${blurId})`}
          opacity={isHovered ? 0.85 : 0.3}
          className="transition-all duration-300"
        />

        {/* ── 2. Liquid Glass Translucent Body (strictly clipped to digit shape) ── */}
        <g clipPath={`url(#${clipId})`}>
          {/* Base dark translucent glass fill */}
          <rect width="100%" height="100%" fill="rgba(8, 20, 16, 0.65)" />

          {/* Interactive cursor-following glow beam */}
          <rect width="100%" height="100%" fill={`url(#${beamId})`} />

          {/* Top liquid glass sheen */}
          <rect width="100%" height="60%" fill={`url(#${sheenId})`} />
        </g>

        {/* ── 3. Interactive BorderGlow Beam along contour ── */}
        <path
          d={digitPath}
          fill="none"
          fillRule="evenodd"
          stroke={`url(#${borderBeamId})`}
          strokeWidth={isHovered ? 3.5 : 2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* ── 4. Liquid Glass Hairline Rim (like chatbot text input bar) ── */}
        <path
          d={digitPath}
          fill="none"
          fillRule="evenodd"
          stroke={isHovered ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.20)'}
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="transition-colors duration-300"
        />

        {/* ── 5. Inner Faint Teal Rim Accent ── */}
        <path
          d={digitPath}
          fill="none"
          fillRule="evenodd"
          stroke="rgba(45, 212, 191, 0.4)"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={isHovered ? 1 : 0.5}
          className="transition-opacity duration-300"
        />
      </svg>
    </div>
  );
}
