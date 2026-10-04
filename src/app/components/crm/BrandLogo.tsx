'use client';

import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, className = '' }) => {
  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="brand-logo-svg"
      >
        <defs>
          <linearGradient id="hc-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--logo-bg-start)" />
            <stop offset="100%" stopColor="var(--logo-bg-end)" />
          </linearGradient>
          <linearGradient id="hc-wing-1" x1="16" y1="5" x2="22" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="hc-wing-2" x1="26" y1="18" x2="14" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
          <linearGradient id="hc-wing-3" x1="6" y1="18" x2="16" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <radialGradient id="hc-core-glow" cx="16" cy="16" r="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer micro-border rounded squircle */}
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8.5"
          fill="url(#hc-bg)"
          stroke="var(--logo-border)"
          strokeWidth="1"
        />

        {/* Ambient nexus glow */}
        <circle cx="16" cy="16" r="8" fill="url(#hc-core-glow)" />

        {/* Multi-brand convergence nexus: 3 aerodynamic interlocking gradient petals */}
        {/* Petal 1: pointing North */}
        <path
          d="M 16 5.5 C 18.8 5.5 22.2 9.2 21 13.5 C 19.8 17.2 16.6 16.5 16 16 C 15.6 14.8 14.2 12 14.6 9 C 14.8 7.2 15.4 5.5 16 5.5 Z"
          fill="url(#hc-wing-1)"
          opacity="0.95"
        />

        {/* Petal 2: pointing South-East */}
        <g transform="rotate(120 16 16)">
          <path
            d="M 16 5.5 C 18.8 5.5 22.2 9.2 21 13.5 C 19.8 17.2 16.6 16.5 16 16 C 15.6 14.8 14.2 12 14.6 9 C 14.8 7.2 15.4 5.5 16 5.5 Z"
            fill="url(#hc-wing-2)"
            opacity="0.95"
          />
        </g>

        {/* Petal 3: pointing South-West */}
        <g transform="rotate(240 16 16)">
          <path
            d="M 16 5.5 C 18.8 5.5 22.2 9.2 21 13.5 C 19.8 17.2 16.6 16.5 16 16 C 15.6 14.8 14.2 12 14.6 9 C 14.8 7.2 15.4 5.5 16 5.5 Z"
            fill="url(#hc-wing-3)"
            opacity="0.95"
          />
        </g>

        {/* Central precision nucleus aperture */}
        <circle cx="16" cy="16" r="2.2" fill="var(--logo-core)" />
        <circle cx="16" cy="16" r="1.1" fill="var(--surface)" />
      </svg>
    </div>
  );
};
