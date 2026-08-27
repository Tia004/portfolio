'use client';

import { useState, useMemo } from 'react';
import { WORLD_COUNTRIES, CONTINENT_BACKGROUNDS, type CountryPathData } from '@/lib/world-map-paths';

interface WorldVectorMapProps {
  countries: { code: string; count: number }[];
  onCountryClick?: (code: string) => void;
  selectedCountry?: string | null;
}

export default function WorldVectorMap({ countries, onCountryClick, selectedCountry }: WorldVectorMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryPathData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [zoomMode, setZoomMode] = useState<'world' | 'europe' | 'americas'>('world');

  const countryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of countries) {
      map.set(c.code.toUpperCase(), c.count);
    }
    return map;
  }, [countries]);

  const maxCount = useMemo(() => {
    return Math.max(...countries.map((c) => c.count), 1);
  }, [countries]);

  const totalVisits = useMemo(() => {
    return countries.reduce((acc, c) => acc + c.count, 0) || 1;
  }, [countries]);

  // Determine SVG viewBox based on zoom mode
  const viewBox = useMemo(() => {
    if (zoomMode === 'europe') return '430 65 170 200';
    if (zoomMode === 'americas') return '60 60 340 390';
    return '0 0 1000 480';
  }, [zoomMode]);

  return (
    <div className="relative w-full flex flex-col gap-3">
      {/* Zoom Mode Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() => setZoomMode('world')}
            className={`px-3 py-1 rounded-lg transition-all ${
              zoomMode === 'world' ? 'bg-teal-400 text-black font-semibold shadow-md shadow-teal-400/20' : 'text-neutral-400 hover:text-white'
            }`}
          >
            🌍 Mondo
          </button>
          <button
            type="button"
            onClick={() => setZoomMode('europe')}
            className={`px-3 py-1 rounded-lg transition-all ${
              zoomMode === 'europe' ? 'bg-teal-400 text-black font-semibold shadow-md shadow-teal-400/20' : 'text-neutral-400 hover:text-white'
            }`}
          >
            🇪🇺 Focus Europa
          </button>
          <button
            type="button"
            onClick={() => setZoomMode('americas')}
            className={`px-3 py-1 rounded-lg transition-all ${
              zoomMode === 'americas' ? 'bg-teal-400 text-black font-semibold shadow-md shadow-teal-400/20' : 'text-neutral-400 hover:text-white'
            }`}
          >
            🌎 Americhe
          </button>
        </div>

        <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
          {countries.length} Paesi Rilevati · {totalVisits} Visite
        </span>
      </div>

      {/* SVG Map Container */}
      <div className="relative rounded-2xl bg-[#030d0a]/90 border border-white/[0.08] overflow-hidden p-2 backdrop-blur-xl">
        <svg
          viewBox={viewBox}
          className="w-full h-auto max-h-[440px] transition-all duration-500 ease-out select-none"
          role="img"
          aria-label="Mappa mondiale interattiva delle visite"
        >
          {/* Subtle ocean grid lines */}
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.8" strokeDasharray="2 3" />
            </pattern>
            {/* Country active gradients */}
            <radialGradient id="active-country-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.4" />
            </radialGradient>
          </defs>

          {/* Grid background */}
          <rect x="0" y="0" width="1000" height="500" fill="url(#map-grid)" />

          {/* Continent Silhouettes background */}
          <g opacity="0.3">
            {CONTINENT_BACKGROUNDS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="#0f2620"
                stroke="#1a4237"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Render individual country borders & shapes */}
          <g>
            {Object.values(WORLD_COUNTRIES).map((c) => {
              const count = countryCountMap.get(c.code) || 0;
              const hasData = count > 0;
              const isSelected = selectedCountry === c.code;
              const isHovered = hoveredCountry?.code === c.code;

              // Calculate choropleth intensity (log scale)
              const logRatio = hasData ? Math.log(count + 1) / Math.log(maxCount + 1) : 0;
              const fillOpacity = hasData ? 0.35 + logRatio * 0.55 : 0.12;

              let fillColor = '#16362e';
              if (isSelected) fillColor = '#2dd4bf';
              else if (hasData) fillColor = '#14b8a6';

              return (
                <path
                  key={c.code}
                  d={c.path}
                  fill={fillColor}
                  fillOpacity={isSelected ? 0.9 : isHovered ? Math.min(1, fillOpacity + 0.3) : fillOpacity}
                  stroke={isSelected ? '#ffffff' : hasData ? '#2dd4bf' : '#275246'}
                  strokeOpacity={isSelected ? 1 : hasData ? 0.8 : 0.4}
                  strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : 1}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onCountryClick?.(c.code)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: ((c.cx - (zoomMode === 'europe' ? 430 : zoomMode === 'americas' ? 60 : 0)) / (zoomMode === 'europe' ? 170 : zoomMode === 'americas' ? 340 : 1000)) * 100,
                        y: ((c.cy - (zoomMode === 'europe' ? 65 : zoomMode === 'americas' ? 60 : 0)) / (zoomMode === 'europe' ? 200 : zoomMode === 'americas' ? 390 : 480)) * 100,
                      });
                    }
                    setHoveredCountry(c);
                  }}
                  onMouseLeave={() => {
                    setHoveredCountry(null);
                    setTooltipPos(null);
                  }}
                />
              );
            })}
          </g>

          {/* Pulsing indicator pins on countries with traffic */}
          <g pointerEvents="none">
            {Object.values(WORLD_COUNTRIES).map((c) => {
              const count = countryCountMap.get(c.code) || 0;
              if (count === 0) return null;

              const isSelected = selectedCountry === c.code;
              const logRatio = Math.log(count + 1) / Math.log(maxCount + 1);
              const pinRadius = 3.5 + logRatio * 5;

              return (
                <g key={`pin-${c.code}`} transform={`translate(${c.cx}, ${c.cy})`}>
                  {/* Pulse wave */}
                  <circle r={pinRadius + 4} fill="none" stroke="#2dd4bf" strokeWidth="1.2">
                    <animate attributeName="r" values={`${pinRadius + 2};${pinRadius + 12};${pinRadius + 2}`} dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Core glowing dot */}
                  <circle
                    r={pinRadius}
                    fill={isSelected ? '#ffffff' : '#2dd4bf'}
                    stroke="#022c22"
                    strokeWidth="1.5"
                    filter="drop-shadow(0 0 6px #2dd4bf)"
                  />

                  {/* Country code label if zoomed or large volume */}
                  {(zoomMode !== 'world' || count > 5 || isSelected) && (
                    <text
                      y={-pinRadius - 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={zoomMode === 'europe' ? 8 : 10}
                      fontWeight="bold"
                      fontFamily="Outfit, sans-serif"
                      className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    >
                      {c.code}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Rich Glassmorphic Tooltip */}
        {hoveredCountry && tooltipPos && (
          <div
            className="absolute z-50 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${Math.max(8, Math.min(92, tooltipPos.x))}%`,
              top: `${Math.max(12, Math.min(90, tooltipPos.y))}%`,
            }}
          >
            <div className="px-3.5 py-2.5 rounded-2xl bg-[#061410]/95 border border-teal-400/40 text-white shadow-2xl backdrop-blur-2xl flex items-center gap-3">
              <span className="text-xl">{hoveredCountry.flag}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white">{hoveredCountry.name}</span>
                  <span className="text-[10px] font-mono text-teal-300 font-bold">({hoveredCountry.code})</span>
                </div>
                <div className="text-[11px] text-neutral-300 font-mono mt-0.5">
                  {countryCountMap.get(hoveredCountry.code) ? (
                    <>
                      <span className="text-teal-400 font-bold">{countryCountMap.get(hoveredCountry.code)} visite</span>
                      <span className="text-neutral-400 ml-1">
                        ({Math.round(((countryCountMap.get(hoveredCountry.code) || 0) / totalVisits) * 100)}%)
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-500">Nessuna visita registrata</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
