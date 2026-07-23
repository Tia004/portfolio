'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Project } from '@prisma/client';
import gsap from 'gsap';

interface ProjectsSpiralProps {
  projects: Project[];
  viewMode: 'spiral' | 'list';
}

export default function ProjectsSpiral({ projects, viewMode }: ProjectsSpiralProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<HTMLDivElement>(null);
  const specPanelRef = useRef<HTMLDivElement>(null);
  const specBackdropRef = useRef<HTMLDivElement>(null);

  // 3D physics state
  const rotationY = useRef(0);
  const targetRotationY = useRef(0);
  const translateY = useRef(0);
  const targetTranslateY = useRef(0);
  const isDragging = useRef(false);
  const startMouseX = useRef(0);
  const startMouseY = useRef(0);
  const startRotationY = useRef(0);
  const startTranslateY = useRef(0);

  const [radius, setRadius] = useState(420);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Dynamic layout radius based on window width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setRadius(260); // Compact mobile
      } else if (window.innerWidth < 1024) {
        setRadius(340); // Tablet
      } else {
        setRadius(460); // Large desktop
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Frame loop for smooth interpolation (Lerp physics)
  useEffect(() => {
    if (viewMode !== 'spiral') return;
    let animationFrameId: number;

    const tick = () => {
      // Automatic slow spin when not dragging or hovering
      if (!isDragging.current && hoveredCardId === null) {
        targetRotationY.current += 0.04;
      }

      // Linear interpolation (lerp) for organic inertia damping
      rotationY.current += (targetRotationY.current - rotationY.current) * 0.08;
      translateY.current += (targetTranslateY.current - translateY.current) * 0.08;

      if (rotorRef.current) {
        rotorRef.current.style.transform = `rotateY(${rotationY.current}deg) translateY(${translateY.current}px)`;
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [hoveredCardId, viewMode]);

  // Handle slide panel transitions on selected project changes
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
      gsap.to(specBackdropRef.current, { opacity: 0.5, pointerEvents: 'auto', duration: 0.4 });
      gsap.to(specPanelRef.current, { x: 0, duration: 0.6, ease: 'power4.out' });
      
      const contents = specPanelRef.current?.querySelectorAll('.fade-spec');
      if (contents) {
        gsap.fromTo(contents,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', delay: 0.15 }
        );
      }
    } else {
      document.body.style.overflow = 'unset';
      gsap.to(specBackdropRef.current, { opacity: 0, pointerEvents: 'none', duration: 0.3 });
      gsap.to(specPanelRef.current, { x: '100%', duration: 0.5, ease: 'power3.inOut' });
    }
  }, [selectedProject]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startMouseX.current = e.clientX;
    startMouseY.current = e.clientY;
    startRotationY.current = targetRotationY.current;
    startTranslateY.current = targetTranslateY.current;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startMouseX.current;
    const deltaY = e.clientY - startMouseY.current;

    targetRotationY.current = startRotationY.current + deltaX * 0.25;
    targetTranslateY.current = startTranslateY.current + deltaY * 0.8;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    startMouseX.current = e.touches[0].clientX;
    startMouseY.current = e.touches[0].clientY;
    startRotationY.current = targetRotationY.current;
    startTranslateY.current = targetTranslateY.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.touches[0].clientX - startMouseX.current;
    const deltaY = e.touches[0].clientY - startMouseY.current;

    targetRotationY.current = startRotationY.current + deltaX * 0.3;
    targetTranslateY.current = startTranslateY.current + deltaY * 1.0;
  };

  // Wheel scroll integration
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== 'spiral') return;
    // Don't scroll page when dragging spiral vertically
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
    }
    targetRotationY.current += e.deltaX * 0.15;
    targetTranslateY.current -= e.deltaY * 0.6;
  };

  return (
    <section id="projects-section" className="relative py-20 px-6 flex flex-col items-center justify-center min-h-[90vh] select-none overflow-hidden">
      
      {/* Title Header: Clean Apple-Style Typo */}
      <div className="text-center mb-12 relative z-30 pointer-events-none mt-6">
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase text-sans">
          projects
        </h2>
        <p className="text-neutral-400 text-[10px] font-mono mt-2 uppercase tracking-widest">
          {viewMode === 'spiral' ? 'drag or scroll to spin the showcase' : 'explore custom creative solutions'}
        </p>
      </div>

      {viewMode === 'spiral' ? (
        /* 3D Visual Sandbox wrapper */
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
          className="w-full max-w-6xl h-[600px] relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
          style={{ perspective: '1200px' }}
        >
          {/* Subtle vertical center-guide line */}
          <div className="absolute w-[1px] h-full border-l border-dashed border-white/5 pointer-events-none"></div>

          {/* 3D Rotating Cylinder container */}
          <div
            ref={rotorRef}
            className="relative w-full h-full flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d', transition: isDragging.current ? 'none' : 'transform 0.1s ease-out' }}
          >
            {projects.length === 0 ? (
              <div 
                className="absolute text-neutral-500 text-xs font-mono border border-dashed border-neutral-800 rounded-3xl px-8 py-12 text-center bg-black/80 backdrop-blur-xl"
                style={{ transform: 'translateZ(0px)' }}
              >
                Nessun progetto caricato.<br/>Carica il tuo primo lavoro dal Master Portal!
              </div>
            ) : (
              projects.map((project, index) => {
                const angleStep = 360 / Math.max(projects.length, 8); // Stagger cards evenly
                const heightStep = 100; // pixels staggered helical spacing
                const angle = index * angleStep;
                const yPos = (index - (projects.length - 1) / 2) * heightStep;

                return (
                  <div
                    key={project.id}
                    onMouseEnter={() => setHoveredCardId(project.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    onClick={() => setSelectedProject(project)}
                    className="absolute w-[280px] md:w-[350px] cursor-pointer warp-card"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateY(${angle}deg) translateZ(${radius}px) translateY(${yPos}px) rotateX(-4deg)`,
                      backfaceVisibility: 'visible',
                    }}
                  >
                    {/* Frameless visual image canvas container with Apple premium bezel */}
                    <div className="relative group overflow-hidden rounded-[24px] aspect-video bg-neutral-950 p-[3px] bg-gradient-to-b from-white/15 to-white/5 shadow-[0_30px_70px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-transform duration-500 ease-out hover:scale-105">
                      <div className="w-full h-full rounded-[21px] overflow-hidden relative bg-neutral-900">
                        <img
                          src={project.thumbnail}
                          alt={project.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          draggable="false"
                        />
                        {/* Subtle inner specular overlay */}
                        <div className="absolute inset-0 rounded-[21px] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                        {/* Dark overlay that fades to transparent on hover */}
                        <div className="absolute inset-0 bg-black/45 group-hover:bg-transparent transition-colors duration-500 rounded-[21px]"></div>
                      </div>
                      
                      {/* Floating Apple-style pill badge centered at bottom of hovered card */}
                      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-mono font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.4)] transition-all duration-350 transform select-none whitespace-nowrap uppercase tracking-wider z-30 ${
                        hoveredCardId === project.id 
                          ? 'opacity-100 translate-y-0 scale-100' 
                          : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>[ ✦ ] {project.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Pristine Apple-Style Minimal List Grid */
        <div className="w-full max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 z-20">
          {projects.length === 0 ? (
            <div className="col-span-full text-center text-neutral-500 text-xs font-mono border border-dashed border-neutral-800 rounded-3xl py-20">
              Nessun progetto caricato.<br/>Carica il tuo primo lavoro dal Master Portal!
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="group cursor-pointer flex flex-col gap-4 text-left select-none"
              >
                <div className="relative overflow-hidden rounded-[24px] aspect-video bg-neutral-950 p-[3px] bg-gradient-to-b from-white/15 to-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                  <div className="w-full h-full rounded-[21px] overflow-hidden relative bg-neutral-900">
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      draggable="false"
                    />
                    <div className="absolute inset-0 rounded-[21px] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors duration-500 rounded-[21px]"></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-start px-2">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold tracking-wider uppercase text-neutral-200 group-hover:text-white transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-[9px] text-neutral-500 font-mono lowercase truncate max-w-[200px]">
                      {project.tags?.split(',')[0]}
                    </p>
                  </div>
                  
                  {/* Minimal link arrow icon */}
                  <div className="w-6 h-6 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300">
                    <svg className="w-2.5 h-2.5 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* High-Contrast White Slide-Over Specifications Details Panel */}
      <div 
        ref={specBackdropRef}
        onClick={() => setSelectedProject(null)}
        className="fixed inset-0 bg-black/0 z-[990] pointer-events-none transition-opacity duration-300"
      ></div>

      <div
        ref={specPanelRef}
        className="fixed top-0 bottom-0 right-0 w-full sm:w-[480px] bg-white text-black z-[1000] p-8 md:p-12 flex flex-col justify-between shadow-[0_0_60px_rgba(0,0,0,0.4)] transform translate-x-full panel-transition select-none"
      >
        {/* Specs Panel Header */}
        <div className="flex justify-between items-center border-b border-neutral-100 pb-6">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">project specifications</span>
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 group-hover:text-black transition-colors">close</span>
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </button>
        </div>

        {/* Specs Modal Body */}
        {selectedProject && (
          <div className="my-auto space-y-6 text-left overflow-y-auto max-h-[60vh] pr-2">
            
            {/* Visual Screen frame inside specs */}
            <div className="fade-spec relative overflow-hidden rounded-2xl aspect-video bg-neutral-100 shadow-sm border border-neutral-100">
              <img
                src={selectedProject.thumbnail}
                alt={selectedProject.title}
                loading="lazy"
                className="w-full h-full object-cover select-none"
                draggable="false"
              />
            </div>

            {/* Typography detailing */}
            <div className="space-y-4">
              <div className="fade-spec flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-3xl font-black tracking-tighter uppercase text-sans">{selectedProject.title}</h3>
              </div>

              <p className="fade-spec text-sm text-neutral-600 leading-relaxed font-light">
                {selectedProject.description}
              </p>

              {/* Staggered tags list */}
              <div className="fade-spec space-y-2 pt-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b pb-2">technologies used</span>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedProject.tags?.split(',').map((t, idx) => (
                    <span 
                      key={idx} 
                      className="bg-neutral-100 border border-neutral-200 text-black text-[9px] font-mono font-semibold px-2.5 py-1 rounded-full uppercase"
                    >
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Specs Action Buttons Footer */}
        {selectedProject && (
          <div className="fade-spec border-t border-neutral-100 pt-8 flex gap-3.5 select-none">
            {selectedProject.projectUrl && (
              <a
                href={selectedProject.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-black text-white text-center py-3.5 rounded-full text-xs font-semibold hover:scale-105 active:scale-95 transition-transform shadow-[0_5px_15px_rgba(0,0,0,0.15)] uppercase tracking-wider"
              >
                launch project •
              </a>
            )}
            {selectedProject.githubUrl && (
              <a
                href={selectedProject.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-black text-center py-3.5 rounded-full text-xs font-semibold hover:scale-105 active:scale-95 transition-transform border border-neutral-200 uppercase tracking-wider"
              >
                view source code
              </a>
            )}
          </div>
        )}
      </div>

    </section>
  );
}
