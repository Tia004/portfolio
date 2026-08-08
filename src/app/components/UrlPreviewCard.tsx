'use client';

import { useState, useEffect } from 'react';
import TiaIcon from './TiaIcon';
import { ExternalLinkIcon } from './icons';

interface UnfurlData {
  title: string;
  description: string;
  favicon: string;
  image: string;
  url: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

export default function UrlPreviewCard({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<UnfurlData | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/unfurl?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          // Only show card if we have at least a title
          setState(json.title ? 'loaded' : 'error');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => { cancelled = true; };
  }, [url]);

  // Loading skeleton
  if (state === 'loading') {
    return (
      <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/[0.06] rounded w-3/4" />
            <div className="h-2.5 bg-white/[0.04] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error or no OG data — fallback to plain link
  if (state === 'error' || !data) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-teal-400 underline hover:text-teal-300 transition-colors"
      >
        {label}
        <TiaIcon icon={ExternalLinkIcon} size={11} className="inline-block shrink-0 opacity-70" strokeWidth={2} />
      </a>
    );
  }

  // Full preview card
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 group"
    >
      <div className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200">
        {/* Image or favicon placeholder */}
        <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.05] shrink-0 overflow-hidden flex items-center justify-center">
          {data.image ? (
            <img
              src={data.image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : data.favicon ? (
            <img
              src={data.favicon}
              alt=""
              className="w-6 h-6 object-contain opacity-60"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <TiaIcon icon={ExternalLinkIcon} size={18} className="text-neutral-600" strokeWidth={1.5} />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {data.favicon && (
              <img
                src={data.favicon}
                alt=""
                className="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="text-xs font-medium text-white truncate group-hover:text-teal-400 transition-colors">
              {data.title}
            </span>
            <TiaIcon icon={ExternalLinkIcon} size={10} className="shrink-0 text-neutral-500 group-hover:text-teal-400/70 transition-colors" strokeWidth={2} />
          </div>
          {data.description && (
            <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
              {data.description}
            </p>
          )}
          <p className="text-[10px] text-neutral-600 mt-1 truncate">
            {(() => {
              try { return new URL(data.url).hostname; }
              catch { return data.url; }
            })()}
          </p>
        </div>
      </div>
    </a>
  );
}
