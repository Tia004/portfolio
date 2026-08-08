'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set the worker source to the pdfjs-dist build
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export interface PdfInfo {
  url: string;
  numPages: number;
}

/**
 * Load a PDF and return the number of pages. Used by the parent carousel
 * to know how many slides to create.
 */
export function usePdfInfo(url: string): { numPages: number; loading: boolean; error: boolean } {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const load = async () => {
      try {
        const pdf = await pdfjs.getDocument(url).promise;
        if (!cancelled) {
          setNumPages(pdf.numPages);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [url]);

  return { numPages, loading, error };
}

interface PdfPageRendererProps {
  url: string;
  pageNumber: number;
  width?: number;
}

/**
 * Render a single PDF page as an image. Handles loading and error states.
 */
export default function PdfPageRenderer({ url, pageNumber, width = 800 }: PdfPageRendererProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const onLoadSuccess = useCallback(() => setLoaded(true), []);
  const onLoadError = useCallback(() => setError(true), []);

  return (
    <Document
      file={url}
      loading={
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
            <span className="text-xs text-neutral-500">Caricamento pagina {pageNumber}...</span>
          </div>
        </div>
      }
      error={
        <div className="flex items-center justify-center p-8 text-neutral-500 text-sm">
          Impossibile caricare il PDF
        </div>
      }
      className="flex items-center justify-center"
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-neutral-400 text-sm">Errore nel caricamento della pagina</span>
        </div>
      )}
    </Document>
  );
}
