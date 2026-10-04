// Disable native ws binary bindings that break in Next.js bundler
process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Communicate } from 'edge-tts-universal';

function getGeminiApiKey(): string {
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (envKey) return envKey;
  try {
    const localPath = '/Users/tia/Jarvis/config/api_keys.json';
    if (fs.existsSync(localPath)) {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (data?.gemini_api_key) return String(data.gemini_api_key).trim();
    }
  } catch {}
  return '';
}

// Mapping of neural voices to Microsoft Edge HD Italian voices
const NEURAL_VOICE_MAP: Record<string, string> = {
  Fenrir: 'it-IT-GiuseppeNeural', // Maschile profondo, autorevole e carismatico
  Charon: 'it-IT-GiuseppeNeural', // Maschile caldo, deciso
  Puck: 'it-IT-DiegoNeural',      // Maschile energico, brillante, dinamico
  Kore: 'it-IT-ElsaNeural',       // Femminile limpida, esecutiva e professionale
  Aoede: 'it-IT-IsabellaNeural',  // Femminile calda, armoniosa ed empatica
  Giuseppe: 'it-IT-GiuseppeNeural',
  Diego: 'it-IT-DiegoNeural',
  Elsa: 'it-IT-ElsaNeural',
  Isabella: 'it-IT-IsabellaNeural',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let textToSpeak = String(body.text || '').trim();
    const voice = String(body.voice || 'Aoede').trim();
    const rate = String(body.rate || '+0%').trim();
    const pitch = String(body.pitch || '+0Hz').trim();

    // 1. If generateBriefing is requested or no text provided, generate an energetic sales briefing
    if (body.generateBriefing || !textToSpeak) {
      const ctx = body.crmContext || {};
      const pipelineTotal = Number(ctx.pipelineTotal || 0).toLocaleString('it-IT');
      const openDealsCount = Number(ctx.openDealsCount || 0);
      const todayTasksCount = Number(ctx.todayTasksCount || 0);
      const brandsList = Array.isArray(ctx.brands) && ctx.brands.length ? ctx.brands.join(', ') : 'i tuoi brand';
      const urgentDeals = Array.isArray(ctx.urgentDeals) && ctx.urgentDeals.length ? ctx.urgentDeals.join('; ') : '';

      const apiKey = getGeminiApiKey();
      if (apiKey) {
        const prompt = `Sei il copilota commerciale intelligente di Hub Commerciale, un assistente vendite esecutivo, brillante, energico e motivazionale.
Genera un riepilogo audio esecutivo brevissimo, carico di grinta e motivazione positiva per la giornata di vendite.

Dati reali del workspace di oggi:
- Valore pipeline attiva: €${pipelineTotal}
- Trattative aperte in gestione: ${openDealsCount}
- Attività prioritarie oggi: ${todayTasksCount}
${urgentDeals ? `- Trattative calde: ${urgentDeals}` : ''}
- Brand attivi: ${brandsList}

Regole ferree:
1. Lunghezza: MASSIMO 45-55 parole (circa 18-22 secondi a voce).
2. Struttura:
   - Apertura fulminea con grinta positiva e focus sui risultati.
   - Sintesi chiara dei numeri e dell'azione n.1 da chiudere oggi.
   - Chiusura carismatica e determinata ("Andiamo a chiudere!" o simile).
3. Stile: Naturale, colloquiale, da ascoltare a voce alta. Nessun asterisco, nessun elenco puntato, niente emoji, scrivi i numeri in parole o cifre semplici. Solo in lingua italiana.`;

        try {
          const textModelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const textRes = await fetch(textModelUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
                thinkingConfig: { thinkingBudget: 0 },
              },
            }),
          });

          if (textRes.ok) {
            const textData = await textRes.json();
            const candidateText = textData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText) {
              textToSpeak = candidateText.replace(/[*_#]/g, '').replace(/\s+/g, ' ').trim();
            }
          }
        } catch (err) {
          console.warn('Briefing text generation error:', err);
        }
      }

      if (!textToSpeak) {
        textToSpeak = `Forza team! Oggi abbiamo una pipeline attiva di ${pipelineTotal} euro con ${openDealsCount} trattative aperte e ${todayTasksCount} priorità da completare. Focus massimo sui clienti caldi e andiamo a chiudere!`;
      }
    }

    // 2. Synthesize High-Definition Neural Speech with Microsoft Edge Neural Voices
    const edgeVoice = NEURAL_VOICE_MAP[voice] || 'it-IT-IsabellaNeural';
    const comm = new Communicate(textToSpeak, {
      voice: edgeVoice,
      rate: rate.startsWith('+') || rate.startsWith('-') ? rate : '+0%',
      pitch: pitch.startsWith('+') || pitch.startsWith('-') ? pitch : '+0Hz',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of comm.stream()) {
      if (chunk.type === 'audio' && chunk.data) {
        chunks.push(Buffer.from(chunk.data));
      }
    }

    if (!chunks.length) {
      throw new Error('Nessun flusso audio generato dalla sintesi neurale.');
    }

    const audioBuffer = Buffer.concat(chunks);
    const base64Briefing = Buffer.from(textToSpeak, 'utf-8').toString('base64');

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'no-store',
        'x-briefing-text': base64Briefing,
        'x-voice-name': voice,
      },
    });
  } catch (err: any) {
    console.error('TTS endpoint error:', err);
    return NextResponse.json(
      { error: err?.message || 'Errore durante la generazione dell’audio neurale.' },
      { status: 500 }
    );
  }
}
