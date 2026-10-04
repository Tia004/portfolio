'use client';

export interface NeuralVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  tone: string;
  description: string;
  isDefault?: boolean;
}

// Studio-Grade Neural Voices (Microsoft Edge Neural in Italian)
export const NEURAL_VOICES: NeuralVoice[] = [
  {
    id: 'Aoede',
    name: 'Aoede (Armoniosa)',
    gender: 'female',
    tone: 'Fluida, calorosa ed empatica',
    description: 'Modello vocale predefinito. Timbro melodico, naturale e accogliente, perfetto per l’ascolto continuativo dei dati.',
    isDefault: true,
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Profonda)',
    gender: 'male',
    tone: 'Bassa, autorevole e determinata',
    description: 'Alternativa maschile profonda, carismatica e sicura. Ideale per briefing strategici e decisioni ad alto impatto.',
  },
  {
    id: 'Puck',
    name: 'Puck (Energica)',
    gender: 'male',
    tone: 'Brillante, vivace e dinamica',
    description: 'Alternativa maschile brillante ed entusiasta, perfetta per dare la carica alla squadra commerciale.',
  },
  {
    id: 'Kore',
    name: 'Kore (Esecutiva)',
    gender: 'female',
    tone: 'Limpida, precisa e professionale',
    description: 'Alternativa femminile chiara ed elegante, eccellente per report esecutivi, sintesi dati e KPI di vendita.',
  },
];

// Backwards compatibility aliases
export const JARVIS_VOICES = NEURAL_VOICES;
export type JarvisVoice = NeuralVoice;

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: 'female' | 'male' | 'unknown';
  isNatural: boolean;
  provider: 'neural-hd' | 'browser';
  description: string;
}

const LOCAL_STORAGE_VOICE_KEY = 'hubc_crm_neural_voice_v2';
const LOCAL_STORAGE_SPEED_KEY = 'hubc_crm_voice_speed_v2';

// Global audio element reference for cloud neural playback
let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let isAudioActive = false;

export function getSavedVoice(): string {
  if (typeof window === 'undefined') return 'Aoede';
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_VOICE_KEY);
    if (saved && NEURAL_VOICES.some((v) => v.id === saved)) return saved;
  } catch {}
  return 'Aoede';
}

export function saveVoice(voiceId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_VOICE_KEY, voiceId);
  } catch {}
}

// Backward compatibility aliases
export const getSavedJarvisVoice = getSavedVoice;
export const saveJarvisVoice = saveVoice;

export function isSpeechPlaying(): boolean {
  return isAudioActive;
}

/**
 * Stop any ongoing audio playback immediately
 */
export function stopAllAudio(): void {
  isAudioActive = false;

  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {}
    currentAudioElement = null;
  }

  if (currentAudioUrl) {
    try {
      URL.revokeObjectURL(currentAudioUrl);
    } catch {}
    currentAudioUrl = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export const stopHumanVoice = stopAllAudio;

/**
 * Play an AI-generated briefing or custom text via High-Definition Neural voices
 */
export async function playAiBriefing(params: {
  crmContext?: {
    pipelineTotal?: number;
    openDealsCount?: number;
    todayTasksCount?: number;
    brands?: string[];
    urgentDeals?: string[];
  };
  text?: string;
  voice?: string;
  onGenerating?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
  onText?: (text: string) => void;
}): Promise<void> {
  stopAllAudio();

  const chosenVoice = params.voice || getSavedVoice();
  params.onGenerating?.();

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generateBriefing: !params.text,
        text: params.text || '',
        voice: chosenVoice,
        crmContext: params.crmContext || {},
      }),
    });

    // Check for briefing text returned in headers
    const headerText = res.headers.get('x-briefing-text');
    if (headerText) {
      try {
        let decoded = '';
        if (headerText.startsWith('%') || headerText.includes(' ')) {
          decoded = decodeURIComponent(headerText);
        } else {
          try {
            const binStr = atob(headerText);
            const bytes = Uint8Array.from(binStr, (c) => c.charCodeAt(0));
            decoded = new TextDecoder('utf-8').decode(bytes);
          } catch {
            decoded = decodeURIComponent(headerText);
          }
        }
        if (decoded) params.onText?.(decoded);
      } catch {}
    }

    const contentType = res.headers.get('content-type') || '';

    if ((contentType.includes('audio/mpeg') || contentType.includes('audio/wav') || contentType.includes('audio/')) && res.ok) {
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      currentAudioUrl = audioUrl;

      const audio = new Audio(audioUrl);
      currentAudioElement = audio;
      isAudioActive = true;

      audio.onplay = () => {
        params.onStart?.();
      };

      audio.onended = () => {
        isAudioActive = false;
        if (currentAudioUrl) {
          URL.revokeObjectURL(currentAudioUrl);
          currentAudioUrl = null;
        }
        currentAudioElement = null;
        params.onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        isAudioActive = false;
        params.onError?.(new Error('Errore durante la riproduzione audio'));
      };

      await audio.play();
      return;
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Sintesi vocale neurale non riuscita');
  } catch (err: any) {
    console.warn('playAiBriefing error:', err);
    isAudioActive = false;
    params.onError?.(err instanceof Error ? err : new Error(String(err)));
    params.onEnd?.();
  }
}

const VOICE_SAMPLES: Record<string, string> = {
  Fenrir: 'Ciao! Sono la voce Fenrir. Ho analizzato tutte le trattative aperte nel tuo CRM: andiamo a vincere la giornata.',
  Puck: 'Forza team! Sono Puck. Massima carica e determinazione sulle opportunità calde di oggi!',
  Kore: 'Buongiorno. Sono Kore. Riepilogo commerciale pronto: concentriamoci subito sulle priorità strategiche ad alto valore.',
  Aoede: 'Benvenuto. Sono Aoede. Il tuo workspace è perfettamente aggiornato e possiamo iniziare con slancio e precisione.',
};

/**
 * Play a short test sample for a specific neural voice
 */
export async function playVoiceSample(
  voiceId: string,
  callbacks?: {
    onGenerating?: () => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: Error) => void;
    onText?: (text: string) => void;
  }
): Promise<void> {
  const sampleText =
    VOICE_SAMPLES[voiceId] ||
    `Ciao! Sono la voce neurale ${voiceId}. Il tuo archivio vendite è sincronizzato e pronto.`;
  await playAiBriefing({
    text: sampleText,
    voice: voiceId,
    onGenerating: callbacks?.onGenerating,
    onStart: callbacks?.onStart,
    onEnd: callbacks?.onEnd,
    onError: callbacks?.onError,
    onText: callbacks?.onText,
  });
}

export function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[-*•]\s+/g, '')
    .replace(/\n\s*\n/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/€\s?([0-9.]+)/g, '$1 euro')
    .replace(/([0-9.]+)€/g, '$1 euro')
    .trim();
}

// Deprecated browser fallback stub (safely maintained for compile compat)
export function speakHumanVoice(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): void {
  // Directly redirect to neural briefing synthesis
  void playAiBriefing({
    text,
    onStart: callbacks?.onStart,
    onEnd: callbacks?.onEnd,
    onError: callbacks?.onError,
  });
}

export function getSavedVoiceSpeed(): number {
  if (typeof window === 'undefined') return 1.0;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_SPEED_KEY);
    return saved ? parseFloat(saved) : 1.0;
  } catch (e) {
    return 1.0;
  }
}

export function savePreferredVoiceSpeed(speed: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_SPEED_KEY, speed.toString());
  } catch (e) {}
}

export function getItalianVoices(): VoiceOption[] {
  return NEURAL_VOICES.map((v) => ({
    id: v.id,
    name: v.name,
    lang: 'it-IT',
    gender: v.gender,
    isNatural: true,
    provider: 'neural-hd',
    description: v.description,
  }));
}

export function getBestDefaultVoice(): any {
  return null;
}

export function savePreferredVoice(voiceName: string) {
  saveVoice(voiceName);
}

export function getSavedVoiceName(): string | null {
  return getSavedVoice();
}
