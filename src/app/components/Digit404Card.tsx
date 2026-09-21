'use client';

import React, { useRef, useState, useId } from 'react';

interface Digit404CardProps {
  digit: '4' | '0';
  index: number;
}

export default function Digit404Card({ digit, index }: Digit404CardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 70, y: 90 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reactId = useId().replace(/:/g, '_');
  const clipId = `clip-digit-${digit}-${index}-${reactId}`;
  const blurId = `blur-glow-${digit}-${index}-${reactId}`;
  const beamId = `beam-${digit}-${index}-${reactId}`;
  const sheenId = `sheen-${digit}-${index}-${reactId}`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x: (x / rect.width) * 140, y: (y / rect.height) * 180 });

    const normX = x / rect.width - 0.5;
    const normY = y / rect.height - 0.5;
    setTilt({ x: normX * 16, y: normY * -16 });
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
          ? `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(1.08, 1.08, 1.08)`
          : 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <svg
        viewBox="0 0 140 180"
        className="w-24 h-32 sm:w-32 sm:h-44 md:w-40 md:h-52 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Clip path outlining the exact silhouette and holes of the digit */}
          <clipPath id={clipId}>
            <text
              x="50%"
              y="79%"
              textAnchor="middle"
              fontSize="168"
              fontWeight="900"
              fontFamily="var(--font-sans), Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
            >
              {digit}
            </text>
          </clipPath>

          {/* Blur filter for ambient borderglow */}
          <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={isHovered ? 8 : 4} />
          </filter>

          {/* Dynamic spotlight beam following cursor inside the digit */}
          <radialGradient id={beamId} cx={mousePos.x} cy={mousePos.y} r="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={isHovered ? 0.85 : 0.25} />
            <stop offset="45%" stopColor="#0d9488" stopOpacity={isHovered ? 0.4 : 0.08} />
            <stop offset="100%" stopColor="#081410" stopOpacity="0" />
          </radialGradient>

          {/* Liquid glass top sheen */}
          <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── 1. Outer Ambient BorderGlow on the shape of the number ── */}
        <text
          x="50%"
          y="79%"
          textAnchor="middle"
          fontSize="168"
          fontWeight="900"
          fontFamily="var(--font-sans), Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth={isHovered ? 14 : 6}
          strokeLinejoin="round"
          filter={`url(#${blurId})`}
          opacity={isHovered ? 0.8 : 0.2}
          className="transition-all duration-300"
        >
          {digit}
        </text>

        {/* ── 2. Liquid Glass Translucent Body (strictly clipped to digit shape) ── */}
        <g clipPath={`url(#${clipId})`}>
          {/* Base dark translucent glass fill */}
          <rect width="100%" height="100%" fill="rgba(8, 20, 16, 0.76)" />

          {/* Interactive cursor-following glow beam */}
          <rect width="100%" height="100%" fill={`url(#${beamId})`} />

          {/* Top liquid glass sheen */}
          <rect width="100%" height="55%" fill={`url(#${sheenId})`} />
        </g>

        {/* ── 3. Liquid Glass Border (Hairline bright rim on the contour) ── */}
        <text
          x="50%"
          y="79%"
          textAnchor="middle"
          fontSize="168"
          fontWeight="900"
          fontFamily="var(--font-sans), Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
          fill="none"
          stroke={isHovered ? '#5eead4' : 'rgba(255, 255, 255, 0.22)'}
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          {digit}
        </text>

        {/* ── 4. Inner Faint Teal Rim Accent ── */}
        <text
          x="50%"
          y="79%"
          textAnchor="middle"
          fontSize="168"
          fontWeight="900"
          fontFamily="var(--font-sans), Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
          fill="none"
          stroke="rgba(45, 212, 191, 0.5)"
          strokeWidth="1"
          strokeLinejoin="round"
          opacity={isHovered ? 1 : 0.4}
          className="transition-opacity duration-300"
        >
          {digit}
        </text>
      </svg>
    </div>
  );
}
