'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfCarouselProps {
  url: string;
  title: string;
}

/**
 * Renders a PDF as a native page-by-page carousel.
 * Each page is a separate slide with its own dot in the navigation.
 * No flash/fade — the measured container width is passed directly to react-pdf
 * so the canvas is rendered at the correct size from the first paint.
 */
export default function PdfCarousel({ url, title }: PdfCarouselProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // ── Container measurement — height-based so full page fits ──
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);

  // Measure container height and pass to Page as `height` — this ensures
  // the entire page is always visible regardless of aspect ratio.
  // Portrait/A4 PDFs get cropped when sized by width; height is the
  // constraining dimension in a tall modal.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setPageHeight(el.clientHeight - 32); // 16px padding top + bottom
    const ro = new ResizeObserver(() => {
      if (wrapperRef.current) {
        setPageHeight(wrapperRef.current.clientHeight - 32);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pdf = await pdfjs.getDocument(url).promise;
        if (!cancelled) {
          setNumPages(pdf.numPages);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [url]);

  const safeIndex = Math.min(pageIndex, Math.max(0, numPages - 1));

  const prevPage = useCallback(() => setPageIndex(i => Math.max(0, i - 1)), []);
  const nextPage = useCallback(() => setPageIndex(i => Math.min(numPages - 1, i + 1)), [numPages]);

  const dots = useMemo(() => Array.from({ length: numPages }, (_, i) => i), [numPages]);

  // Fallback height before measurement
  const height = pageHeight > 0 ? pageHeight : Math.min((typeof window !== 'undefined' ? window.innerHeight : 900) * 0.65, 600);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 text-sm mb-2">Impossibile caricare il PDF</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-teal-400 text-xs underline hover:text-teal-300">
            Aprilo in una nuova scheda
          </a>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
          <span className="text-xs text-neutral-500">Caricamento PDF...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#090909]">
      {/* Page counter */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-5 pb-10 pt-5">
        <span className="text-xs font-medium tracking-[0.16em] text-white/70">
          {safeIndex + 1} / {numPages}
        </span>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
          PDF
        </span>
      </div>

      {/* Page display — no flash, stable width from first render */}
      <div
        ref={wrapperRef}
        className="flex h-full w-full items-center justify-center p-6"
      >
        <Document
          file={url}
          loading={null}
          error={null}
          className="flex items-center justify-center"
        >
          <Page
            key={`page_${safeIndex + 1}`}
            pageNumber={safeIndex + 1}
            height={height}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="rounded-lg shadow-2xl shadow-black/50"
          />
        </Document>
      </div>

      {/* Prev/Next buttons */}
      {safeIndex > 0 && (
        <button
          type="button"
          onClick={prevPage}
          aria-label="Pagina precedente"
          className="absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70"
        >
          <span aria-hidden="true" className="text-2xl leading-none">‹</span>
        </button>
      )}
      {safeIndex < numPages - 1 && (
        <button
          type="button"
          onClick={nextPage}
          aria-label="Pagina successiva"
          className="absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70"
        >
          <span aria-hidden="true" className="text-2xl leading-none">›</span>
        </button>
      )}

      {/* Page dots */}
      {numPages > 1 && (
        <div className="absolute bottom-5 left-1/2 z-20 flex max-w-[80%] -translate-x-1/2 gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
          {dots.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPageIndex(i)}
              aria-label={`Pagina ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === safeIndex ? 'w-7 bg-teal-400' : 'w-1.5 bg-white/35 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
