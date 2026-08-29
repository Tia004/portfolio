'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useLanguage } from './LanguageProvider';
import { t, type ProjectData } from '@/lib/translations';
import { useSectionNav } from '@/app/hooks/useSectionNav';
import { Cancel01Icon, ExternalLinkIcon, PlayIcon } from './icons';
import TiaIcon from './TiaIcon';
const PdfCarousel = dynamic(() => import('./PdfCarousel'), { ssr: false });

interface ProjectModalProps {
  project: ProjectData;
  onClose: () => void;
  onQuote: (project: ProjectData) => void;
}

/** Convert youtu.be or youtube.com/watch URLs to embed URLs */
function getEmbedUrl(url: string, isVideo: boolean): string {
  if (!isVideo) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=0`;
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}?autoplay=0`;
  return url;
}

export default function ProjectModal({ project, onClose, onQuote }: ProjectModalProps) {
  const { lang } = useLanguage();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchY = useRef({ start: 0, last: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipingRef = useRef(false);
  const [showIndex, setShowIndex] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const galleryTouchRef = useRef({ startX: 0, startY: 0 });

  const {
    contentRef: sideContentRef,
    registerSection,
    activeSection,
    scrollToSection,
  } = useSectionNav({
    rootMargin: '-60px 0px -30% 0px',
    threshold: [0, 0.25, 0.5, 0.75, 1],
    deps: [project],
    scrollOffset: 8,
    scrollParentIsOffsetParent: true,
  });

  // ── Section labels for the mobile index overlay ──
  const sectionLabels: Record<string, string[]> = {
    it: ['Info progetto', 'Descrizione', 'Azioni'],
    en: ['Project info', 'Description', 'Actions'],
    es: ['Info proyecto', 'Descripción', 'Acciones'],
  };
  const sections = sectionLabels[lang] || sectionLabels.it;
  const indexBtnLabel = lang === 'it' ? 'Indice' : lang === 'es' ? 'Índice' : 'Index';
  const closeLabel = lang === 'it' ? 'Chiudi' : lang === 'es' ? 'Cerrar' : 'Close';
  const carouselLabel = lang === 'it' ? 'Carosello' : lang === 'es' ? 'Carrusel' : 'Carousel';
  const previousSlideLabel = lang === 'it' ? 'Slide precedente' : lang === 'es' ? 'Diapositiva anterior' : 'Previous slide';
  const nextSlideLabel = lang === 'it' ? 'Slide successiva' : lang === 'es' ? 'Diapositiva siguiente' : 'Next slide';
  const pdfLabel = lang === 'it' ? 'Portfolio PDF' : lang === 'es' ? 'Portfolio PDF' : 'PDF portfolio';
  const slideLabel = lang === 'it' ? 'slide' : lang === 'es' ? 'diapositiva' : 'slide';
  const galleryCountLabel = lang === 'it' ? 'di' : lang === 'es' ? 'de' : 'of';

  // Clean up safety timer on unmount
  useEffect(() => {
    return () => { if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current); };
  }, []);

  // ── Swipe-to-dismiss (mobile) — pull-to-close from scroll top ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const THRESHOLD = 100;
    let scrollableEl: HTMLElement | null = null;
    let galleryGesture = false;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      galleryGesture = Boolean(target.closest('[aria-roledescription="carousel"]'));
      if (galleryGesture) return;
      scrollableEl = target.closest('.overflow-y-auto');
      // If touching a scrollable area that's scrolled down, don't track swipe
      if (scrollableEl && scrollableEl.scrollTop > 0) return;
      touchY.current.start = e.touches[0].clientY;
      touchY.current.last = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      // The gallery owns horizontal swipes; do not let the modal's pull-to-close
      // gesture compete with it on diagonal/trackpad-like touches.
      if (galleryGesture) return;
      // Cancel swipe if sidebar started scrolling during gesture
      if (scrollableEl && scrollableEl.scrollTop > 0) { swipingRef.current = false; setSwipeOffset(0); return; }
      const diff = e.touches[0].clientY - touchY.current.start;
      if (diff > 10) {
        swipingRef.current = true;
        setIsSwiping(true);
        touchY.current.last = e.touches[0].clientY;
        setSwipeOffset(diff);
      }
    };
    const onTouchEnd = () => {
      if (galleryGesture) {
        galleryGesture = false;
        scrollableEl = null;
        return;
      }
      scrollableEl = null;
      if (!swipingRef.current) return;
      swipingRef.current = false;
      setIsSwiping(false);
      const diff = touchY.current.last - touchY.current.start;
      if (diff > THRESHOLD) {
        onClose();
      } else {
        setSwipeOffset(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onClose]);
  const embedUrl = getEmbedUrl(project.url, !!project.isVideo);
  const isVideo = Boolean(project.isVideo);
  const isWebSite = Boolean(
    project.url &&
    !isVideo &&
    (project.url.startsWith('http://') || project.url.startsWith('https://')) &&
    !project.url.match(/\.(png|jpe?g|webp|gif|svg|pdf)$/i) &&
    (project.category?.toLowerCase() === 'sviluppo' ||
     project.category?.toLowerCase() === 'web' ||
     project.category?.toLowerCase() === 'app' ||
     project.category?.toLowerCase() === 'software' ||
     (project.tags && project.tags.some((t) => t.toLowerCase().includes('next.js') || t.toLowerCase().includes('react') || t.toLowerCase().includes('web') || t.toLowerCase().includes('e-commerce'))))
  );

  const gallery = (project.gallery && project.gallery.length > 0)
    ? project.gallery
    : (project.documents && project.documents.length > 0)
      ? project.documents
      : (!isWebSite && !isVideo && project.thumbnail)
        ? [project.thumbnail]
        : [];

  const activeGalleryIndex = Math.min(galleryIndex, Math.max(0, gallery.length - 1));
  const hasGallery = gallery.length > 0;
  const activeMedia = hasGallery ? gallery[activeGalleryIndex] : '';
  const isActiveImage = !!activeMedia && !activeMedia.toLowerCase().endsWith('.pdf');

  // Lock body scroll — use position:fixed instead of overflow:hidden so
  // that native wheel events are not blocked for the modal's scrollable content.
  // Lenis is still running and intercepts wheel events at the document level,
  // so scrollable children must have data-lenis-prevent to bypass it.
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    // iOS Safari workaround: block rubber-band overscroll
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overscrollBehavior = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Close on Escape — fullscreen exits first, then the modal itself.
  useEffect(() => {
    const cb = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fullscreen) setFullscreen(false);
      else onClose();
    };
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [onClose, fullscreen]);

  // Reset zoom/pan whenever the slide or fullscreen state changes.
  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, [galleryIndex, fullscreen]);

  const zoomIn = useCallback(() => {
    setZoomScale((scale) => Math.min(4, Math.round((scale + 0.25) * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomScale((scale) => {
      const next = Math.max(1, Math.round((scale - 0.25) * 100) / 100);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const onPanStart = useCallback((e: React.PointerEvent) => {
    if (zoomScale <= 1) return;
    panRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, baseX: panOffset.x, baseY: panOffset.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [zoomScale, panOffset]);

  const onPanMove = useCallback((e: React.PointerEvent) => {
    if (!panRef.current.dragging) return;
    setPanOffset({ x: panRef.current.baseX + (e.clientX - panRef.current.startX), y: panRef.current.baseY + (e.clientY - panRef.current.startY) });
  }, []);

  const onPanEnd = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Focus trap: move focus inside the modal on open, restore on close
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const el = containerRef.current;
    if (el) {
      const first = el.querySelector<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    }
    return () => { previousFocusRef.current?.focus(); };
  }, []);

  const modal = (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center p-3 sm:p-5 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      {/* Backdrop — full-viewport backdrop-blur over the whole page while
          the body is composited (position:fixed scroll-lock) is the exact
          surface that triggered the Samsung/Android renderer-kill with 24px.
          On mobile the base is bg-black/80 (80% opaque), so the blur behind
          it is barely visible — and it is LIVE: it re-samples every frame
          while the review marquee behind the modal keeps animating, which
          delays the modal's first paint after the tap (mobile INP). So on
          mobile the backdrop is a solid dark layer (same look, no per-frame
          re-blur); sm+ keeps the full 24px blur. Weak devices get all blur
          removed by .is-low-end anyway. */}
      <div
        className="fixed inset-0 bg-black/80 sm:bg-black/80 sm:backdrop-blur-xl animate-in fade-in duration-300"
        onClick={handleBackdrop}
      />

      {/* ═══ Bento Box Layout ═══ */}
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-[1600px] max-h-[95vh] flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-5 animate-in fade-in zoom-in-95 duration-300 fill-mode-forwards"
        style={{ transform: `translateY(${swipeOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        
        {/* ── Floating actions (top-right, INSIDE the window): fullscreen + close ── */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label={lang === 'it' ? 'Schermo intero' : lang === 'es' ? 'Pantalla completa' : 'Fullscreen'}
            title={lang === 'it' ? 'Schermo intero' : lang === 'es' ? 'Pantalla completa' : 'Fullscreen'}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition-all border border-white/[0.08] backdrop-blur-xl"
          >
            {/* Maximize icon */}
            <svg aria-hidden="true" className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition-all border border-white/[0.08] backdrop-blur-xl"
          >
            <TiaIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Main Panel: live project or Instagram-style gallery ── */}
        {/* The panels keep the glass blur only from sm+ — below sm a large
            backdrop-blur-xl surface over the composited body (position:fixed
            scroll-lock + Lenis) is a known GPU-crash trigger on phones; the
            same reason the full-viewport backdrop drops the blur on mobile. */}
        <div className="flex-1 lg:flex-[3] relative bg-white/[0.06] backdrop-blur-md sm:bg-white/[0.03] sm:backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/40 min-h-0">
          {hasGallery ? (
            <div
              role="region"
              aria-roledescription="carousel"
              className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#090909]"
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') setGalleryIndex((index) => Math.max(0, index - 1));
                if (event.key === 'ArrowRight') setGalleryIndex((index) => Math.min(gallery.length - 1, index + 1));
              }}
              onTouchStart={(event) => {
                galleryTouchRef.current = {
                  startX: event.touches[0]?.clientX ?? 0,
                  startY: event.touches[0]?.clientY ?? 0,
                };
              }}
              onTouchEnd={(event) => {
                const touch = event.changedTouches[0];
                if (!touch) return;
                const deltaX = touch.clientX - galleryTouchRef.current.startX;
                const deltaY = touch.clientY - galleryTouchRef.current.startY;
                if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY)) return;
                setGalleryIndex((index) => Math.max(0, Math.min(gallery.length - 1, index + (deltaX < 0 ? 1 : -1))));
              }}
              tabIndex={0}
              aria-label={`${project.title} — ${activeGalleryIndex + 1} ${galleryCountLabel} ${gallery.length}`}
            >
              <span className="sr-only" aria-live="polite">
                {project.title}, {activeGalleryIndex + 1} {galleryCountLabel} {gallery.length}
              </span>
              {gallery.length > 1 && (
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-5 pb-10 pt-5">
                  <span className="text-xs font-medium tracking-[0.16em] text-white/70">{activeGalleryIndex + 1} / {gallery.length}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">{carouselLabel}</span>
                </div>
              )}

              {/* Ambient Background Glow */}
              {isActiveImage && (
                <div
                  className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-700"
                  style={{ backgroundImage: `url(${activeMedia.replace(/\.(png|jpe?g)$/i, '.webp')})` }}
                />
              )}

              <div className="relative h-full w-full overflow-hidden">
                <div
                  className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: `translateX(-${activeGalleryIndex * 100}%)` }}
                >
                  {gallery.map((image, index) => {
                    // Keep the full track geometry for seamless navigation, but
                    // only mount media near the active slide. Large mixed-work
                    // galleries can otherwise create dozens of image decodes at once.
                    const isNearActive = Math.abs(index - activeGalleryIndex) <= 1;
                    return (
                      <div key={image} className="flex h-full w-full shrink-0 items-center justify-center overflow-hidden p-4 sm:p-6 md:p-8">
                        {isNearActive && (image.toLowerCase().endsWith('.pdf') ? (
                          <PdfCarousel url={image} title={project.title} />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <picture className="flex h-full w-full items-center justify-center min-h-0">
                            {image.startsWith('/uploads/') && (
                              <>
                                <source srcSet={image.replace(/\.(png|jpe?g)$/i, '.avif')} type="image/avif" />
                                <source srcSet={image.replace(/\.(png|jpe?g)$/i, '.webp')} type="image/webp" />
                              </>
                            )}
                            <img
                              src={image.replace(/\.(png|jpe?g)$/i, '.webp')}
                              alt={`${project.title}, ${slideLabel} ${index + 1}`}
                              className="min-h-0 max-w-full max-h-full rounded-xl object-contain shadow-2xl shadow-black/80"
                              draggable="false"
                              loading="eager"
                              decoding="async"
                            />
                          </picture>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {gallery.length > 1 && activeGalleryIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setGalleryIndex((index) => index - 1)}
                  aria-label={previousSlideLabel}
                  className="absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70 cursor-pointer"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">‹</span>
                </button>
              )}
              {gallery.length > 1 && activeGalleryIndex < gallery.length - 1 && (
                <button
                  type="button"
                  onClick={() => setGalleryIndex((index) => index + 1)}
                  aria-label={nextSlideLabel}
                  className="absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70 cursor-pointer"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">›</span>
                </button>
              )}

              {gallery.length > 1 && (
                <div className="absolute bottom-5 left-1/2 z-20 flex max-w-[80%] -translate-x-1/2 gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
                  {gallery.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setGalleryIndex(index)}
                      aria-label={`${index + 1} ${image.toLowerCase().endsWith('.pdf') ? pdfLabel : slideLabel}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${index === activeGalleryIndex ? 'w-7 bg-teal-400' : 'w-1.5 bg-white/35 hover:bg-white/70'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <picture>
                    {project.thumbnail.startsWith('/uploads/') && (
                      <>
                        <source srcSet={project.thumbnail.replace(/\.(png|jpe?g)$/i, '.avif')} type="image/avif" />
                        <source srcSet={project.thumbnail.replace(/\.(png|jpe?g)$/i, '.webp')} type="image/webp" />
                      </>
                    )}
                    <img src={project.thumbnail.replace(/\.(png|jpe?g)$/i, '.webp')} alt={project.title} className="absolute inset-0 h-full w-full object-cover opacity-30" draggable="false" />
                  </picture>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeLoaded(true);
                      setIframeLoading(true);
                      safetyTimerRef.current = setTimeout(() => setIframeLoading(false), 10_000);
                    }}
                    className="relative z-10 flex flex-col items-center gap-3 group"
                    aria-label={project.isVideo ? t('progetti.watch', lang) : t('progetti.visit', lang)}
                  >
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/90 shadow-2xl shadow-teal-500/40 transition-all duration-300 group-hover:scale-110 group-hover:bg-teal-400 sm:h-24 sm:w-24">
                      <TiaIcon icon={project.isVideo ? PlayIcon : ExternalLinkIcon} size={32} className="ml-1 text-white" strokeWidth={2.5} />
                    </span>
                    <span className="text-xs font-medium tracking-wide text-white/60 transition-colors group-hover:text-white/90 sm:text-sm">{project.isVideo ? t('progetti.watch', lang) : t('progetti.visit', lang)}</span>
                  </button>
                </div>
              )}
              {iframeLoaded && (
                <>
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-md sm:bg-white/[0.03] sm:backdrop-blur-xl">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
                      <div className="h-3 w-32 animate-pulse rounded-full bg-white/[0.06]" />
                    </div>
                  )}
                  <iframe src={embedUrl} title={project.title} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onLoad={() => setIframeLoading(false)} onError={() => setIframeLoading(false)} />
                </>
              )}
            </>
          )}
        </div>

        {/* ── Side Panel: Project info (bento card) — data-lenis-prevent so Lenis skips preventDefault on wheel events ── */}
        <div className="flex flex-col lg:w-[320px] xl:w-[380px] shrink-0">
          {/* Scrollable content — glass blur only from sm+ (see main panel) */}
          <div ref={sideContentRef} data-lenis-prevent data-lenis-prevent-touch className="bg-white/[0.06] backdrop-blur-md sm:bg-white/[0.03] sm:backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-teal-400/15 shadow-[0_0_20px_rgba(45,212,191,0.12),0_25px_50px_-12px_rgba(0,0,0,0.4)] p-5 sm:p-6 xl:p-8 pt-16 sm:pt-16 xl:pt-16 flex-1 overflow-y-auto relative overscroll-contain">
            {/* Content */}
            <div className="pt-2">
            {/* ── Section 0: Title & Tags ── */}
            <div ref={registerSection(0)} data-section={0}>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-tight">{project.title}</h2>
              
              {project.tags && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {project.tags.map((tag) => (
                    <span key={tag} className="bg-white/[0.06] text-neutral-400 text-xs px-3 py-1.5 rounded-lg border border-white/[0.04]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 1: Description ── */}
            <div ref={registerSection(1)} data-section={1}>
              <p className="text-neutral-300 text-sm leading-relaxed">{project.description}</p>
            </div>

            {/* ── Section 2: Actions ── */}
            <div ref={registerSection(2)} data-section={2}>
              <div className="flex flex-col gap-2.5 mt-6 pt-6 border-t border-white/[0.06]">
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border border-white/10 text-white hover:bg-white/[0.06]"
                  >
                    {project.isVideo ? t('progetti.watch', lang) : t('progetti.visit', lang)}
                    <TiaIcon icon={project.isVideo ? PlayIcon : ExternalLinkIcon} size={16} strokeWidth={2} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onQuote(project)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all bg-teal-600 text-white hover:bg-teal-500"
                >
                  {t('progetti.quote', lang)}
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* ── Mobile index trigger (outside scrollable, always visible) ── */}
          <button
            type="button"
            onClick={() => setShowIndex(true)}
            className="lg:hidden w-full py-3 rounded-b-2xl bg-teal-600/80 backdrop-blur-lg border-t border-teal-400/20 text-white text-xs font-medium hover:bg-teal-600 transition-all shrink-0"
          >
            {indexBtnLabel}
          </button>
        </div>

      </div>

        {/* ── Fullscreen viewer — the active slide/PDF/live site fills the
             viewport with a tiny gutter (p-2/p-4) so the content never touches
             the edges, plus an exit button. Works on every browser (pure CSS
             overlay, no Fullscreen API — iOS Safari ignores element
             requestFullscreen). ── */}
        {fullscreen && (
          <div
            className="fixed inset-0 z-[10030] bg-black flex items-center justify-center p-2 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'it' ? 'Progetto a schermo intero' : lang === 'es' ? 'Proyecto a pantalla completa' : 'Project fullscreen'}
          >
            <div className="relative w-full h-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label={lang === 'it' ? 'Esci da schermo intero' : lang === 'es' ? 'Salir de pantalla completa' : 'Exit fullscreen'}
                title={lang === 'it' ? 'Esci da schermo intero' : lang === 'es' ? 'Salir de pantalla completa' : 'Exit fullscreen'}
                className="absolute top-1 sm:top-2 right-1 sm:right-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-all border border-white/15 backdrop-blur-xl"
              >
                <TiaIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
              </button>

              {hasGallery ? (
                <div className="w-full h-full relative flex items-center justify-center">
                  <div
                    className="w-full h-full flex items-center justify-center overflow-hidden"
                    style={{ cursor: isActiveImage && zoomScale > 1 ? 'grab' : 'default' }}
                    onPointerDown={onPanStart}
                    onPointerMove={onPanMove}
                    onPointerUp={onPanEnd}
                    onPointerLeave={onPanEnd}
                  >
                    {(() => {
                      const media = gallery[activeGalleryIndex];
                      if (!media) return null;
                      return media.toLowerCase().endsWith('.pdf') ? (
                        <PdfCarousel url={media} title={project.title} />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <picture className="flex h-full w-full items-center justify-center min-h-0">
                          {media.startsWith('/uploads/') && (
                            <>
                              <source srcSet={media.replace(/\.(png|jpe?g)$/i, '.avif')} type="image/avif" />
                              <source srcSet={media.replace(/\.(png|jpe?g)$/i, '.webp')} type="image/webp" />
                            </>
                          )}
                          <img
                            src={media.replace(/\.(png|jpe?g)$/i, '.webp')}
                            alt={`${project.title}, ${slideLabel} ${activeGalleryIndex + 1}`}
                            className="min-h-0 max-h-full max-w-full object-contain rounded-lg shadow-2xl shadow-black/60 select-none"
                            style={{
                              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                              transformOrigin: 'center',
                              transition: panRef.current.dragging ? 'none' : 'transform 0.2s cubic-bezier(0.22,1,0.36,1)',
                            }}
                            draggable="false"
                          />
                        </picture>
                      );
                    })()}
                  </div>
                  {activeGalleryIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setGalleryIndex((i) => i - 1)}
                      aria-label={previousSlideLabel}
                      className="absolute left-2 sm:left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
                    >
                      <span aria-hidden="true" className="text-3xl leading-none">‹</span>
                    </button>
                  )}
                  {activeGalleryIndex < gallery.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setGalleryIndex((i) => i + 1)}
                      aria-label={nextSlideLabel}
                      className="absolute right-2 sm:right-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
                    >
                      <span aria-hidden="true" className="text-3xl leading-none">›</span>
                    </button>
                  )}
                  {isActiveImage && (
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoomScale >= 4}
                        aria-label={lang === 'it' ? 'Ingrandisci' : lang === 'es' ? 'Acercar' : 'Zoom in'}
                        title={lang === 'it' ? 'Ingrandisci' : lang === 'es' ? 'Acercar' : 'Zoom in'}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/85 hover:text-white border border-white/15 backdrop-blur-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span aria-hidden="true" className="text-2xl leading-none">+</span>
                      </button>
                      <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoomScale <= 1}
                        aria-label={lang === 'it' ? 'Riduci zoom' : lang === 'es' ? 'Alejar' : 'Zoom out'}
                        title={lang === 'it' ? 'Riduci zoom' : lang === 'es' ? 'Alejar' : 'Zoom out'}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/85 hover:text-white border border-white/15 backdrop-blur-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span aria-hidden="true" className="text-2xl leading-none">−</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : project.url ? (
                <iframe
                  src={embedUrl}
                  title={project.title}
                  className="w-full h-full border-0 rounded-lg bg-white"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>
          </div>
        )}

        {/* ── Mobile Index Overlay ── */}
        {showIndex && (
          <div
            className="fixed inset-0 z-[10020] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setShowIndex(false)}
          >
            <div
              className="bg-[#121212] border border-white/[0.08] rounded-2xl p-6 w-full max-w-[260px] shadow-2xl shadow-black/60"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white text-sm font-semibold mb-5 tracking-wide text-center">
                {indexBtnLabel}
              </h3>
              <div className="flex flex-col gap-1.5">
                {sections.map((label, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      scrollToSection(i);
                      setShowIndex(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${
                      activeSection === i
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'text-neutral-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                        activeSection === i
                          ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]'
                          : 'bg-neutral-600'
                      }`}
                    />
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowIndex(false)}
                className="mt-5 w-full text-center text-neutral-500 text-xs hover:text-neutral-300 transition-colors py-1"
              >
                {closeLabel}
              </button>
            </div>
          </div>
        )}

    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
