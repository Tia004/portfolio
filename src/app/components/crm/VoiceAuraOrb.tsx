'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  NEURAL_VOICES,
  NeuralVoice,
  getSavedVoice,
  saveVoice,
  playVoiceSample,
  playAiBriefing,
  stopAllAudio,
  isSpeechPlaying,
} from '@/lib/crm/speechVoice';

interface VoiceAuraOrbProps {
  crmContext?: {
    pipelineTotal?: number;
    openDealsCount?: number;
    todayTasksCount?: number;
    brands?: string[];
    urgentDeals?: string[];
  };
  onClose?: () => void;
  standalone?: boolean;
}

export const VoiceAuraOrb: React.FC<VoiceAuraOrbProps> = ({
  crmContext,
  onClose,
  standalone = false,
}) => {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Aoede');
  const [status, setStatus] = useState<'idle' | 'generating' | 'playing'>('idle');
  const [spokenText, setSpokenText] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSelectedVoiceId(getSavedVoice());
    return () => {
      stopAllAudio();
    };
  }, []);

  const currentVoice: NeuralVoice =
    NEURAL_VOICES.find((v) => v.id === selectedVoiceId) || NEURAL_VOICES[0];

  const handleSelectVoice = async (id: string, autoPlay = true) => {
    stopAllAudio();
    setSelectedVoiceId(id);
    saveVoice(id);

    if (autoPlay) {
      setStatus('generating');
      setFeedback(`Voce ${id} selezionata. Riproduzione prova in corso…`);
      setSpokenText('');

      await playVoiceSample(id, {
        onGenerating: () => setStatus('generating'),
        onStart: () => {
          setStatus('playing');
          const v = NEURAL_VOICES.find((item) => item.id === id);
          setFeedback(`In riproduzione: ${v?.name || id}`);
        },
        onText: (text) => setSpokenText(text),
        onEnd: () => {
          setStatus('idle');
          setFeedback(`Voce ${id} pronta e impostata come predefinita.`);
        },
        onError: (err) => {
          setStatus('idle');
          setFeedback(`Errore: ${err.message || 'Riproduzione non riuscita'}`);
        },
      });
    } else {
      setStatus('idle');
      setFeedback(`Voce ${id} impostata come predefinita.`);
    }
  };

  const handlePlaySample = async () => {
    if (status === 'playing') {
      stopAllAudio();
      setStatus('idle');
      setFeedback('Riproduzione interrotta.');
      return;
    }

    stopAllAudio();
    setStatus('generating');
    setFeedback(`Preparazione prova voce ${currentVoice.name}…`);
    setSpokenText('');

    await playVoiceSample(selectedVoiceId, {
      onGenerating: () => setStatus('generating'),
      onStart: () => {
        setStatus('playing');
        setFeedback(`In riproduzione: ${currentVoice.name}`);
      },
      onText: (text) => setSpokenText(text),
      onEnd: () => {
        setStatus('idle');
        setFeedback('');
      },
      onError: (err) => {
        setStatus('idle');
        setFeedback(`Errore: ${err.message || 'Riproduzione non riuscita'}`);
      },
    });
  };

  const handlePlayBriefing = async () => {
    if (status === 'playing') {
      stopAllAudio();
      setStatus('idle');
      setFeedback('Riproduzione interrotta.');
      return;
    }

    stopAllAudio();
    setStatus('generating');
    setFeedback('Generazione briefing esecutivo con i dati del CRM…');
    setSpokenText('');

    await playAiBriefing({
      voice: selectedVoiceId,
      crmContext,
      onGenerating: () => setStatus('generating'),
      onStart: () => {
        setStatus('playing');
        setFeedback(`Briefing in riproduzione (${currentVoice.id})`);
      },
      onText: (text) => setSpokenText(text),
      onEnd: () => {
        setStatus('idle');
        setFeedback('Briefing completato.');
      },
      onError: (err) => {
        setStatus('idle');
        setFeedback(`Errore: ${err.message || 'Generazione briefing non riuscita'}`);
      },
    });
  };

  // Canvas Aurora Borealis Fluid Animation (ChatGPT Voice Mode recreation with soft blur)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += status === 'playing' ? 0.035 : status === 'generating' ? 0.025 : 0.012;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = w / 2 - 2;

      ctx.clearRect(0, 0, w, h);

      // Clip to circular orb
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // 1. Cosmic Deep Indigo / Sapphire base
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bgGrad.addColorStop(0, '#1d3557');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Multi-blob organic aurora with soft blur (removes ANY sharp straight lines)
      ctx.filter = 'blur(22px)';

      const pulse =
        status === 'playing'
          ? Math.sin(t * 3.5) * 18 + 8
          : status === 'generating'
          ? Math.sin(t * 2) * 8
          : 0;

      // Blob 1: Deep Cyan / Azure billowing glow
      const b1x = cx + Math.sin(t * 0.8) * 35;
      const b1y = cy + Math.cos(t * 0.6) * 30 + pulse * 0.3;
      const g1 = ctx.createRadialGradient(b1x, b1y, 5, b1x, b1y, r * 0.75 + pulse);
      g1.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
      g1.addColorStop(0.5, 'rgba(37, 99, 235, 0.75)');
      g1.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(b1x, b1y, r * 0.75 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Blob 2: Luminous celestial white core (soft cloud)
      const b2x = cx + Math.cos(t * 1.1) * 22;
      const b2y = cy + Math.sin(t * 0.9) * 25 + pulse * 0.5;
      const g2 = ctx.createRadialGradient(b2x, b2y, 2, b2x, b2y, r * 0.55 + pulse * 0.6);
      g2.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      g2.addColorStop(0.4, 'rgba(224, 242, 254, 0.85)');
      g2.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(b2x, b2y, r * 0.55 + pulse * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Blob 3: Subtle lavender/lilla harmonic accent
      const b3x = cx + Math.sin(t * 0.7 + 2) * 32;
      const b3y = cy + Math.cos(t * 1.2 + 1) * 28;
      const g3 = ctx.createRadialGradient(b3x, b3y, 0, b3x, b3y, r * 0.65);
      g3.addColorStop(0, 'rgba(165, 180, 252, 0.75)');
      g3.addColorStop(0.6, 'rgba(99, 102, 241, 0.4)');
      g3.addColorStop(1, 'rgba(30, 27, 75, 0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(b3x, b3y, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Reset filter for rim
      ctx.filter = 'none';

      // 3. Delicate vignette rim
      const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
      rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
      rimGrad.addColorStop(0.85, 'rgba(15, 23, 42, 0.25)');
      rimGrad.addColorStop(1, 'rgba(2, 6, 23, 0.7)');
      ctx.fillStyle = rimGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();

      // Ethereal circular outer border glow
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle =
        status === 'playing'
          ? 'rgba(165, 180, 252, 0.8)'
          : status === 'generating'
          ? 'rgba(96, 165, 250, 0.6)'
          : 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status]);

  const voiceIndex = NEURAL_VOICES.findIndex((v) => v.id === selectedVoiceId);

  return (
    <div className={`flex flex-col items-center text-center ${standalone ? 'p-6 max-w-xl mx-auto' : 'w-full'}`}>
      {/* Header info */}
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10">
              Voce Neurale AI
            </span>
            {status === 'playing' && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                In riproduzione
              </span>
            )}
            {status === 'generating' && (
              <span className="text-[11px] font-medium text-zinc-300 animate-pulse">
                Elaborazione sintesi…
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">
            Personalizzazione Voce & Briefing
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Seleziona la voce desiderata: verrà utilizzata automaticamente per i briefing giornalieri.
          </p>
        </div>

        {onClose && (
          <button
            onClick={() => {
              stopAllAudio();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Chiudi"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Aurora Borealis Orb Container (ChatGPT Voice style - completely blurry and organic) */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Ambient atmospheric fluid glow */}
        <div
          className={`absolute -inset-6 rounded-full filter blur-3xl transition-all duration-700 pointer-events-none ${
            status === 'playing'
              ? 'bg-blue-500/40 scale-110 opacity-100'
              : status === 'generating'
              ? 'bg-indigo-500/30 scale-105 opacity-80 animate-pulse'
              : 'bg-blue-600/20 scale-95 opacity-50'
          }`}
        />

        {/* Circular Orb Canvas */}
        <div
          className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.35)] border border-white/15 bg-black cursor-pointer group"
          onClick={handlePlaySample}
          title="Clicca per ascoltare o interrompere la voce"
        >
          <canvas
            ref={canvasRef}
            width={208}
            height={208}
            className="w-full h-full block"
          />

          {/* Central Hover Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25 backdrop-blur-[1px]">
            <span className="material-symbols-outlined text-white text-[38px] drop-shadow-md">
              {status === 'playing' ? 'stop_circle' : 'volume_up'}
            </span>
          </div>
        </div>
      </div>

      {/* Voice Name & Feedback */}
      <div className="mb-4">
        <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5 flex-wrap">
          <span>{currentVoice.name}</span>
          <span className="text-[11px] text-zinc-400 font-normal">
            ({currentVoice.gender === 'male' ? 'Maschile' : 'Femminile'})
          </span>
          {currentVoice.isDefault ? (
            <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/10">
              Modello Predefinito
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
              Alternativa
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-300 font-medium mt-0.5">
          {currentVoice.tone}
        </p>
        <p className="text-[11px] text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
          {currentVoice.description}
        </p>
      </div>

      {/* Interactive Voice Range Slider & Cards */}
      <div className="w-full max-w-md bg-[#121316] border border-white/10 rounded-2xl p-4 shadow-lg mb-4 text-left">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-zinc-400 font-medium">Modello Vocale & Alternative</span>
          <span className="text-zinc-300 font-mono text-[11px] font-medium">
            {voiceIndex + 1} di {NEURAL_VOICES.length}
          </span>
        </div>

        {/* Range Track Slider */}
        <div className="relative my-2">
          <input
            type="range"
            min={0}
            max={NEURAL_VOICES.length - 1}
            step={1}
            value={voiceIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              const v = NEURAL_VOICES[idx];
              if (v) handleSelectVoice(v.id, true);
            }}
            className="w-full accent-zinc-200 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
            aria-label="Slider selezione voce"
          />
        </div>

        {/* Quick select voice cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {NEURAL_VOICES.map((v) => {
            const isSelected = selectedVoiceId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectVoice(v.id, true)}
                className={`py-2 px-2 rounded-xl text-center text-xs font-medium transition-all border cursor-pointer ${
                  isSelected
                    ? 'border-white/25 bg-[#181920] text-white shadow-none'
                    : 'border-white/10 bg-[#14151a] text-zinc-400 hover:text-zinc-200 hover:border-white/16 hover:bg-[#16171d]'
                }`}
              >
                <div className="truncate flex items-center justify-center gap-1">
                  <span>{v.id}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                  )}
                </div>
                <div className="text-[10px] font-normal text-zinc-500 truncate mt-0.5">
                  {v.isDefault ? 'Predefinita' : 'Alternativa'} · {v.gender === 'male' ? 'M' : 'F'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spoken Text live subtitle if available */}
      {spokenText && (
        <div className="w-full max-w-md bg-[#121316] border border-white/10 rounded-xl p-3 mb-4 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Testo pronunciato
          </span>
          <p className="text-xs text-zinc-200 leading-relaxed italic">
            &ldquo;{spokenText}&rdquo;
          </p>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-center gap-2.5 w-full max-w-md">
        {status === 'playing' ? (
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              setStatus('idle');
              setFeedback('Riproduzione interrotta.');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">stop_circle</span>
            <span>Interrompi riproduzione</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={status === 'generating'}
              onClick={handlePlaySample}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/20 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">volume_up</span>
              <span>Ascolta prova ({currentVoice.id})</span>
            </button>

            <button
              type="button"
              disabled={status === 'generating'}
              onClick={handlePlayBriefing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 bg-[#14151a] hover:bg-[#181920] hover:border-white/20 text-white text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Genera il riepilogo motivazionale con i numeri reali del CRM"
            >
              <span className="material-symbols-outlined text-[18px] text-zinc-300">auto_awesome</span>
              <span>Briefing vendite di prova</span>
            </button>
          </>
        )}
      </div>

      {feedback && (
        <span className="text-[11px] text-zinc-400 mt-2 block animate-fade-in">
          {feedback}
        </span>
      )}
    </div>
  );
};
