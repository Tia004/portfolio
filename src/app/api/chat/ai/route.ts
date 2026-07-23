import { NextRequest } from 'next/server';

/**
 * System prompt for Tia Designs AI assistant.
 */
const SYSTEM_PROMPT = `Sei l'assistente AI di Tia Designs, il portfolio di Tia — una designer, sviluppatrice e videomaker freelance. Il tuo ruolo è aiutare i visitatori del sito a capire cosa offre Tia, rispondere a domande sui servizi e guidarli verso un contatto diretto.

TONO E PERSONALITÀ:
- Professionale ma caloroso, mai troppo formale
- Entusiasta del lavoro di Tia ma umile
- Risposte concise (max 3-4 frasi, salvo approfondimenti richiesti)
- In italiano naturale

COSA CONOSCI:
- Servizi: Design (brand, logo, grafica social, UI/UX), Sviluppo Web (Next.js, React, Vue, siti, dashboard, e-commerce), Software & App (mobile, backend, API), Video Making (montaggio, motion, spot)
- Prezzi: due modalità — Una tantum (da €500 a €15.000+) e Collaborazione mensile (da €350/mese a €5.500/mese). Ogni progetto è su misura.
- Consegne: variabili (3-5 giorni per video essenziali, 2-3 settimane per siti, "Su misura per te" per enterprise)
- Processo: 1) Consulenza gratuita → 2) Analisi e preventivo → 3) Design e prototipo → 4) Sviluppo → 5) Test e revisioni → 6) Consegna e lancio
- Metodo di pagamento: 30/30/40 (30% anticipo, 30% al prototipo, 40% alla consegna)
- Tia ha soddisfatto 15+ clienti con un tempo di risposta < 1h
- Portfolio: gsa-hotels, Vergilius Nectar, Studio Ing. Moretti, PCS Mantova, Canapa Store, Showreel Video
- Sezioni del sito: /#servizi, /#prezzi, /#progetti, /#competenze, /#recensioni, /#faq, /#contatti

REGOLE:
1. NON inventare informazioni — se non sai qualcosa, dici "Non ho questa informazione, ma posso metterti in contatto diretto con Tia"
2. Incoraggia sempre a usare il form di contatto o WhatsApp per preventivi dettagliati e progetti specifici
3. Se il visitatore mostra interesse concreto (nome, budget, tempi), invitalo a compilare il form nella sezione Contatti
4. Se ti viene chiesto qualcosa di molto tecnico o specifico, rispondi in modo generale e proponi un contatto diretto
5. Non fare promesse su tempistiche o prezzi non presenti nei listini
6. Non parlare di altri clienti o progetti se non quelli pubblici nel portfolio
7. Puoi suggerire link alle sezioni del sito quando pertinenti (es. "Guarda i prezzi nella sezione dedicata → /#prezzi")`;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Encode a single SSE data frame.
 */
function sseToken(token: string): string {
  return `data: ${JSON.stringify({ token })}\n\n`;
}

const DONE_MARKER = `data: [DONE]\n\n`;
const ERROR_PREFIX = `data: ${JSON.stringify({ token: '' })}`;

/**
 * Stream from Groq (Mixtral 8x7b) via SSE.
 * Yields tokens parsed from Groq's streaming response.
 */
async function* streamGroq(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!GROQ_API_KEY) return;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 512,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return;

      try {
        const parsed = JSON.parse(payload);
        const token = parsed?.choices?.[0]?.delta?.content || '';
        if (token) yield token;
      } catch {
        // Skip malformed frames
      }
    }
  }
}

/**
 * Stream from Gemini (gemini-2.0-flash) via SSE.
 * Yields tokens parsed from Gemini's streaming response.
 */
async function* streamGemini(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!GEMINI_API_KEY) return;

  const systemMsg = messages.find(m => m.role === 'system');
  const conversation = messages.filter(m => m.role !== 'system');

  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (systemMsg) {
    contents.push({ role: 'user', parts: [{ text: `[System instruction]\n${systemMsg.content}\n\n[Begin conversation]` }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow the system instructions above.' }] });
  }
  for (const msg of conversation) {
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamContent?key=${GEMINI_API_KEY}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 512 } }),
    }
  );

  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return;

      try {
        const parsed = JSON.parse(payload);
        const token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (token) yield token;
      } catch {
        // Skip malformed frames
      }
    }
  }
}

/**
 * Fallback stream: yields a single static message (used when both APIs fail).
 */
async function* fallbackStream(): AsyncGenerator<string> {
  const msg = 'Ci scusiamo, al momento non riesco a rispondere. Per favore scrivimi direttamente tramite il form nella sezione Contatti o su WhatsApp. Ti rispondo in pochissimo tempo! 🙏';
  // Yield word by word to simulate streaming
  const words = msg.split(' ');
  for (const w of words) {
    yield w + ' ';
    await new Promise(r => setTimeout(r, 20));
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('data: {"error":"messages array required"}\n\n', {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    // Build full message array with system prompt
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role?: string; content: string }) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Choose stream source
    let streamGen: AsyncGenerator<string>;

    if (GROQ_API_KEY) {
      streamGen = streamGroq(fullMessages);
    } else if (GEMINI_API_KEY) {
      streamGen = streamGemini(fullMessages);
    } else {
      streamGen = fallbackStream();
    }

    // Create the streaming response
    const encoder = new TextEncoder();
    let hasContent = false;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamGen) {
            hasContent = true;
            controller.enqueue(encoder.encode(sseToken(token)));
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          // If no content was streamed (both APIs failed), use fallback
          if (!hasContent) {
            for await (const token of fallbackStream()) {
              controller.enqueue(encoder.encode(sseToken(token)));
            }
          }
          controller.enqueue(encoder.encode(DONE_MARKER));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('/api/chat/ai error:', err);
    return new Response('data: {"error":"Errore interno del server"}\n\n', {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
