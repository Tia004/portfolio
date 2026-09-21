'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import TiaIcon from './TiaIcon';
import { PlayIcon, RefreshIcon } from './icons';

interface Bug {
  x: number;
  y: number;
  speed: number;
  size: number;
  type: 'bug' | 'commit';
}

export default function RetroGame404() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Player state
  const playerRef = useRef({ x: 180, y: 190, size: 14, speed: 4 });
  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });
  const bugsRef = useRef<Bug[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tiadesigns_404_highscore');
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // ignore
    }
  }, []);

  const spawnBug = useCallback(() => {
    const isCommit = Math.random() < 0.25;
    const bug: Bug = {
      x: Math.random() * 340 + 10,
      y: -10,
      speed: Math.random() * 2 + (isCommit ? 1.5 : 2 + scoreRef.current * 0.05),
      size: isCommit ? 10 : 12,
      type: isCommit ? 'commit' : 'bug',
    };
    bugsRef.current.push(bug);
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    scoreRef.current = 0;
    playerRef.current = { x: 180, y: 190, size: 14, speed: 4 };
    bugsRef.current = [];
  };

  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let spawnTimer = 0;

    const loop = () => {
      const p = playerRef.current;
      const keys = keysRef.current;

      // Update player
      if (keys.left) p.x = Math.max(p.size, p.x - p.speed);
      if (keys.right) p.x = Math.min(360 - p.size, p.x + p.speed);
      if (keys.up) p.y = Math.max(p.size, p.y - p.speed);
      if (keys.down) p.y = Math.min(220 - p.size, p.y + p.speed);

      // Spawn bugs
      spawnTimer++;
      if (spawnTimer > Math.max(15, 45 - Math.floor(scoreRef.current / 2))) {
        spawnBug();
        spawnTimer = 0;
      }

      // Clear
      ctx.fillStyle = '#05110d';
      ctx.fillRect(0, 0, 360, 220);

      // Draw subtle retro grid
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 360; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 220);
        ctx.stroke();
      }
      for (let y = 0; y < 220; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(360, y);
        ctx.stroke();
      }

      // Draw & update bugs
      for (let i = bugsRef.current.length - 1; i >= 0; i--) {
        const b = bugsRef.current[i];
        b.y += b.speed;

        // Collision check
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        if (dist < (b.size + p.size) * 0.75) {
          if (b.type === 'commit') {
            // Collect commit
            scoreRef.current += 5;
            setScore(scoreRef.current);
            bugsRef.current.splice(i, 1);
            continue;
          } else {
            // Hit a bug: game over
            setGameOver(true);
            setIsPlaying(false);
            if (scoreRef.current > highScore) {
              setHighScore(scoreRef.current);
              try {
                localStorage.setItem('tiadesigns_404_highscore', String(scoreRef.current));
              } catch {
                // ignore
              }
            }
            return;
          }
        }

        // Off screen
        if (b.y > 230) {
          if (b.type === 'bug') {
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
          bugsRef.current.splice(i, 1);
          continue;
        }

        // Draw bug / commit
        if (b.type === 'bug') {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#2dd4bf';
          ctx.shadowColor = '#2dd4bf';
          ctx.shadowBlur = 10;
          ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
        }
        ctx.shadowBlur = 0;
      }

      // Draw Player (Ship with teal glow)
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#2dd4bf';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.size);
      ctx.lineTo(p.x - p.size, p.y + p.size);
      ctx.lineTo(p.x + p.size, p.y + p.size);
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 6);
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, highScore, spawnBug]);

  return (
    <div className="mt-8 flex flex-col items-center">
      <div className="relative rounded-2xl border border-white/[0.12] bg-[#05110d]/90 p-3 shadow-2xl backdrop-blur-xl">
        {/* Scoreboard */}
        <div className="mb-2 flex items-center justify-between px-2 text-xs font-mono text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            SCORE: <strong className="text-teal-300">{score}</strong>
          </span>
          <span>
            BEST: <strong className="text-white">{highScore}</strong>
          </span>
        </div>

        {/* Canvas container */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#05110d]">
          <canvas ref={canvasRef} width={360} height={220} className="block max-w-full touch-none" />

          {/* Overlay when not playing */}
          {!isPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-center">
              {gameOver ? (
                <>
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-400 mb-1">
                    GAME OVER — BUG DETECTED
                  </p>
                  <p className="text-xs text-neutral-400 mb-4">
                    Punteggio: <span className="font-mono text-teal-300 font-bold">{score}</span>
                  </p>
                  <button
                    type="button"
                    onClick={startGame}
                    className="inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2 text-xs font-bold text-black shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-400 active:scale-95"
                  >
                    <TiaIcon icon={RefreshIcon} size={13} strokeWidth={2.5} />
                    RIPROVA
                  </button>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">
                    PIXEL BUG DODGER
                  </p>
                  <p className="text-[11px] text-neutral-400 max-w-[240px] leading-relaxed mb-4">
                    Schiva i bug rossi e raccogli i commit teal mentre cerchi la via di casa!
                  </p>
                  <button
                    type="button"
                    onClick={startGame}
                    className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-6 py-2.5 text-xs font-bold text-black shadow-lg shadow-teal-400/25 transition-all hover:bg-teal-300 active:scale-95 cursor-pointer"
                  >
                    <TiaIcon icon={PlayIcon} size={13} strokeWidth={2.5} />
                    GIOCA
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile touch controls */}
        {isPlaying && (
          <div className="mt-3 flex sm:hidden justify-center gap-3 select-none">
            <button
              type="button"
              onTouchStart={() => { keysRef.current.left = true; }}
              onTouchEnd={() => { keysRef.current.left = false; }}
              className="h-10 w-12 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white font-mono active:bg-teal-500/20"
            >
              ◀
            </button>
            <button
              type="button"
              onTouchStart={() => { keysRef.current.up = true; }}
              onTouchEnd={() => { keysRef.current.up = false; }}
              className="h-10 w-12 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white font-mono active:bg-teal-500/20"
            >
              ▲
            </button>
            <button
              type="button"
              onTouchStart={() => { keysRef.current.down = true; }}
              onTouchEnd={() => { keysRef.current.down = false; }}
              className="h-10 w-12 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white font-mono active:bg-teal-500/20"
            >
              ▼
            </button>
            <button
              type="button"
              onTouchStart={() => { keysRef.current.right = true; }}
              onTouchEnd={() => { keysRef.current.right = false; }}
              className="h-10 w-12 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white font-mono active:bg-teal-500/20"
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
