'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef, Component, type ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfCarouselProps {
  url: string;
  title: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PdfErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PdfCarousel caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function PdfCarouselInner({ url }: PdfCarouselProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [pageAspect, setPageAspect] = useState<number | null>(null);

  // ── Container measurement ──
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const pad = 24;
    const update = () => {
      if (wrapperRef.current) {
        setContainerSize({
          w: Math.max(100, wrapperRef.current.clientWidth - pad),
          h: Math.max(100, wrapperRef.current.clientHeight - pad),
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  const onDocLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoaded(true);
    setError(false);
  }, []);

  const onDocLoadError = useCallback((err: Error) => {
    console.error('Failed to load PDF document:', err);
    setError(true);
    setLoaded(true);
  }, []);

  const onPageLoadSuccess = useCallback((page: { width: number; height: number; originalWidth?: number; originalHeight?: number }) => {
    const w = page.originalWidth || page.width;
    const h = page.originalHeight || page.height;
    if (w > 0 && h > 0) {
      setPageAspect(w / h);
    }
  }, []);

  const safeIndex = Math.min(pageIndex, Math.max(0, numPages - 1));
  const prevPage = useCallback(() => setPageIndex((i) => Math.max(0, i - 1)), []);
  const nextPage = useCallback(() => setPageIndex((i) => Math.min(numPages - 1, i + 1)), [numPages]);

  const dots = useMemo(() => Array.from({ length: numPages }, (_, i) => i), [numPages]);

  const { cw, ch } = { cw: containerSize.w, ch: containerSize.h };
  let renderWidth: number | undefined = undefined;
  let renderHeight: number | undefined = undefined;

  if (cw > 0 && ch > 0) {
    if (pageAspect && pageAspect > 0) {
      const containerAspect = cw / ch;
      if (containerAspect > pageAspect) {
        // Limited by height
        renderHeight = Math.min(ch, 850);
      } else {
        // Limited by width
        renderWidth = Math.min(cw, 1200);
      }
    } else {
      renderHeight = Math.min(ch, 750);
    }
  } else {
    renderHeight = 520;
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-neutral-400 text-sm font-medium">Impossibile visualizzare l&apos;anteprima del PDF</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400/40 bg-teal-500/10 text-teal-300 hover:text-white hover:bg-teal-500/20 text-xs font-semibold backdrop-blur-xl shadow-lg transition-all duration-200 cursor-pointer"
          >
            <span>Apri PDF in una nuova scheda</span>
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#090909]">
      {/* Page counter */}
      {numPages > 0 && (
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent px-5 pb-10 pt-5 pointer-events-none">
          <span className="pointer-events-auto text-xs font-semibold tracking-[0.16em] text-white/90 rounded-full border border-white/[0.12] bg-[#081410]/80 px-3.5 py-1 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_12px_rgba(0,0,0,0.4)]">
            {safeIndex + 1} / {numPages}
          </span>
          <span className="pointer-events-auto rounded-full border border-white/[0.12] bg-[#081410]/80 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-400 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_12px_rgba(0,0,0,0.4)]">
            PDF
          </span>
        </div>
      )}

      {/* Page display */}
      <div
        ref={wrapperRef}
        className="flex h-full w-full items-center justify-center p-4 sm:p-6"
      >
        <Document
          file={url}
          onLoadSuccess={onDocLoadSuccess}
          onLoadError={onDocLoadError}
          loading={
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
              <span className="text-xs text-neutral-400 font-medium">Caricamento PDF...</span>
            </div>
          }
          className="flex items-center justify-center"
        >
          {numPages > 0 && (
            <Page
              key={`page_${safeIndex + 1}`}
              pageNumber={safeIndex + 1}
              width={renderWidth}
              height={renderHeight}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="rounded-lg shadow-2xl shadow-black/60 overflow-hidden"
            />
          )}
        </Document>
      </div>

      {/* Prev/Next buttons */}
      {numPages > 1 && safeIndex > 0 && (
        <button
          type="button"
          onClick={prevPage}
          aria-label="Pagina precedente"
          className="absolute left-3 sm:left-5 top-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-[#081410]/80 text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-teal-400/50 hover:bg-[#0e241c]/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_24px_rgba(45,212,191,0.35)] cursor-pointer active:scale-95 group"
        >
          <svg aria-hidden="true" className="w-5 h-5 text-white/90 group-hover:text-teal-300 transition-all duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {numPages > 1 && safeIndex < numPages - 1 && (
        <button
          type="button"
          onClick={nextPage}
          aria-label="Pagina successiva"
          className="absolute right-3 sm:right-5 top-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-[#081410]/80 text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-teal-400/50 hover:bg-[#0e241c]/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_24px_rgba(45,212,191,0.35)] cursor-pointer active:scale-95 group"
        >
          <svg aria-hidden="true" className="w-5 h-5 text-white/90 group-hover:text-teal-300 transition-all duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Page dots */}
      {numPages > 1 && (
        <div className="absolute bottom-4 sm:bottom-5 left-1/2 z-20 flex max-w-[85%] -translate-x-1/2 gap-1.5 overflow-x-auto rounded-full border border-white/[0.14] bg-[#081410]/80 px-3.5 py-2 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_24px_rgba(0,0,0,0.5)]">
          {dots.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPageIndex(i)}
              aria-label={`Pagina ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === safeIndex ? 'w-8 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.7)]' : 'w-1.5 bg-white/30 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PdfCarousel(props: PdfCarouselProps) {
  return (
    <PdfErrorBoundary
      fallback={(err) => (
        <div className="flex h-full w-full items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-neutral-400 text-sm font-medium">Impossibile caricare il documento PDF</p>
            <a
              href={props.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400/40 bg-teal-500/10 text-teal-300 hover:text-white hover:bg-teal-500/20 text-xs font-semibold backdrop-blur-xl shadow-lg transition-all duration-200 cursor-pointer"
            >
              <span>Apri PDF in una nuova scheda</span>
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    >
      <PdfCarouselInner {...props} />
    </PdfErrorBoundary>
  );
}
