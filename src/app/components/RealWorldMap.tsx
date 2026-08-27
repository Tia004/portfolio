'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRY_COORDINATES, CITY_COORDINATES } from '@/lib/geo-coordinates';

interface RealWorldMapProps {
  countries: { code: string; count: number }[];
  cities?: { city: string; count: number }[];
  onCountryClick?: (code: string) => void;
  selectedCountry?: string | null;
}

export default function RealWorldMap({
  countries,
  cities = [],
  onCountryClick,
  selectedCountry,
}: RealWorldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [activeView, setActiveView] = useState<'world' | 'europe' | 'italy' | 'americas' | 'asia'>('world');
  const [mapLoaded, setMapLoaded] = useState(false);

  const totalVisits = countries.reduce((acc, c) => acc + c.count, 0) || 1;

  // Initialize Leaflet Map with CartoDB Dark Matter tiles
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      // Dynamically load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: [25, 10],
        zoom: 2,
        minZoom: 1.5,
        maxZoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Dark Matter tiles (ultra-detailed real world map with dark aesthetic)
      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoKey)}`
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Custom markers container
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      setMapLoaded(true);
    };

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render glowing pulsating pins on the real map
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markersLayerRef.current) return;

    const renderMarkers = async () => {
      const L = (await import('leaflet')).default;
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      const maxCountryCount = Math.max(...countries.map((c) => c.count), 1);

      // Render Country Pins
      countries.forEach((c) => {
        const coord = COUNTRY_COORDINATES[c.code.toUpperCase()];
        if (!coord) return;

        const isSelected = selectedCountry === c.code.toUpperCase();
        const share = Math.round((c.count / totalVisits) * 100);
        const logRatio = Math.log(c.count + 1) / Math.log(maxCountryCount + 1);
        const pinSize = isSelected ? 32 : Math.max(18, Math.min(28, 16 + logRatio * 12));

        const iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group" style="width: ${pinSize}px; height: ${pinSize}px;">
            <div class="absolute inset-0 rounded-full bg-teal-400 opacity-40 animate-ping" style="animation-duration: 2.5s;"></div>
            <div class="relative w-full h-full rounded-full ${
              isSelected
                ? 'bg-white border-2 border-teal-300 shadow-[0_0_15px_#2dd4bf]'
                : 'bg-teal-400 border-2 border-black/80 shadow-[0_0_10px_#2dd4bf]'
            } flex items-center justify-center text-[10px] font-bold font-mono text-black">
              ${c.code}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-radar-pin',
          iconSize: [pinSize, pinSize],
          iconAnchor: [pinSize / 2, pinSize / 2],
        });

        const marker = L.marker([coord.lat, coord.lng], { icon: customIcon }).addTo(markersLayer);

        const popupContent = `
          <div style="background: #081410; border: 1px solid rgba(45, 212, 191, 0.4); border-radius: 16px; padding: 12px 14px; color: #fff; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.8); min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 18px;">${coord.flag}</span>
              <div>
                <div style="font-weight: bold; font-size: 13px; color: #fff;">${coord.name}</div>
                <div style="font-size: 10px; font-family: monospace; color: #2dd4bf;">Codice ISO: ${c.code}</div>
              </div>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: #a3a3a3;">Visite:</span>
              <span style="font-size: 12px; font-weight: bold; color: #2dd4bf; font-family: monospace;">${c.count.toLocaleString()} (${share}%)</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: false,
          className: 'custom-leaflet-popup',
        });

        marker.on('click', () => {
          onCountryClick?.(c.code);
        });
      });

      // Render City Pins if available
      cities.forEach((ct) => {
        const coord = CITY_COORDINATES[ct.city];
        if (!coord) return;

        const cityHtml = `
          <div class="relative flex items-center justify-center cursor-pointer" style="width: 14px; height: 14px;">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black shadow-[0_0_8px_#34d399]"></div>
          </div>
        `;

        const cityIcon = L.divIcon({
          html: cityHtml,
          className: 'custom-city-pin',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([coord.lat, coord.lng], { icon: cityIcon }).addTo(markersLayer);
        marker.bindTooltip(`📍 ${ct.city} (${ct.count} visite)`, {
          direction: 'top',
          className: 'custom-city-tooltip',
        });
      });
    };

    void renderMarkers();
  }, [countries, cities, selectedCountry, totalVisits, mapLoaded, onCountryClick]);

  // Jump camera views
  const handleViewChange = (view: 'world' | 'europe' | 'italy' | 'americas' | 'asia') => {
    setActiveView(view);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (view === 'world') {
      map.flyTo([25, 10], 2, { duration: 1.2 });
    } else if (view === 'europe') {
      map.flyTo([48, 12], 4, { duration: 1.2 });
    } else if (view === 'italy') {
      map.flyTo([42.5, 12.5], 5.8, { duration: 1.2 });
    } else if (view === 'americas') {
      map.flyTo([20, -75], 3, { duration: 1.2 });
    } else if (view === 'asia') {
      map.flyTo([20, 100], 3, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-3">
      {/* Top View Selector Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/[0.08] text-xs">
          {[
            { id: 'world', label: '🌍 Mondo Intero' },
            { id: 'europe', label: '🇪🇺 Focus Europa' },
            { id: 'italy', label: '🇮🇹 Focus Italia' },
            { id: 'americas', label: '🌎 Americhe' },
            { id: 'asia', label: '🌏 Asia' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleViewChange(v.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === v.id
                  ? 'bg-teal-400 text-black font-bold shadow-md shadow-teal-400/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Mappa Reale CartoDB Dark Matter</span>
          </span>
          <span className="text-neutral-600">·</span>
          <span>{totalVisits} Visite Totali</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[450px] sm:h-[500px] rounded-3xl overflow-hidden border border-white/[0.08] bg-[#050f0c] shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

        {/* Floating guide legend overlay */}
        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-2xl bg-[#081410]/90 border border-white/10 backdrop-blur-xl text-xs text-neutral-300 pointer-events-none shadow-xl flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
            <span className="text-[11px]">Paesi con Visite</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-[11px]">Città Tracciate</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip {
          background: #081410 !important;
          border: 1px solid rgba(45, 212, 191, 0.4) !important;
        }
        .leaflet-container {
          background-color: #030712 !important;
          font-family: inherit !important;
        }
        .custom-city-tooltip {
          background: #081410 !important;
          border: 1px solid rgba(52, 211, 153, 0.5) !important;
          color: #fff !important;
          border-radius: 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 4px 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important;
        }
      `}</style>
    </div>
  );
}
