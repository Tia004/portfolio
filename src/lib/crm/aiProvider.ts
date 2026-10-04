'use client';

export type AIProviderType =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'nvidia'
  | 'groq'
  | 'custom';

export interface AIModelDefinition {
  id: string;
  name: string;
  badge: 'Free' | 'Billed';
  description: string;
  requiresBilling: boolean;
  contextWindow?: string;
  latency?: string;
}

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  isBillingActive?: boolean; // Controls whether Billed models are unlocked
}

// Complete updated model catalog with Free and Billed badges
export const PROVIDER_MODELS: Record<AIProviderType, AIModelDefinition[]> = {
  gemini: [
    {
      id: 'gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash Lite (Predefinito Gratuito)',
      badge: 'Free',
      description: 'Velocità massima, zero costi, ottimale per copilot vendite, estrazione compiti e sintesi vocale.',
      requiresBilling: false,
      contextWindow: '1M token',
      latency: 'Ultra-rapido',
    },
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      badge: 'Billed',
      description: 'Multimodale di nuova generazione ad alto throughput per allegati e documenti pesanti.',
      requiresBilling: true,
      contextWindow: '1M token',
      latency: 'Veloce',
    },
    {
      id: 'gemini-3.5-pro',
      name: 'Gemini 3.5 Pro',
      badge: 'Billed',
      description: 'Ragionamento strategico enterprise, audit trattative complesse e scoring finanziario.',
      requiresBilling: true,
      contextWindow: '2M token',
      latency: 'Ragionato',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      badge: 'Free',
      description: 'Versione precedente gratuita per chiamate ad alta frequenza e task operativi.',
      requiresBilling: false,
      contextWindow: '1M token',
      latency: 'Rapido',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      badge: 'Billed',
      description: 'Elaborazione logica profonda e validazione codice o schemi.',
      requiresBilling: true,
      contextWindow: '2M token',
      latency: 'Ragionato',
    },
  ],
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      badge: 'Billed',
      description: 'Modello compatto ad alta efficienza per micro-task commerciali e risposte rapide.',
      requiresBilling: true,
      contextWindow: '128k token',
      latency: 'Ultra-rapido',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o (Omni Flagship)',
      badge: 'Billed',
      description: 'Modello ammiraglia OpenAI per comprensione multimodale e conversazione fluida.',
      requiresBilling: true,
      contextWindow: '128k token',
      latency: 'Veloce',
    },
    {
      id: 'o3-mini',
      name: 'o3-mini (Ragionamento)',
      badge: 'Billed',
      description: 'Ragionamento logico e matematico avanzato con catena di pensiero CoT.',
      requiresBilling: true,
      contextWindow: '128k token',
      latency: 'Pensiero 2-4s',
    },
    {
      id: 'o1',
      name: 'o1 (Deep Strategic Reasoning)',
      badge: 'Billed',
      description: 'Massima intelligenza deduttiva per negoziazioni critiche e contratti enterprise.',
      requiresBilling: true,
      contextWindow: '200k token',
      latency: 'Pensiero 5-15s',
    },
  ],
  anthropic: [
    {
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
      badge: 'Billed',
      description: 'L\'ultimo modello ibrido Claude: scrittura impeccabile e pensiero analitico profondo.',
      requiresBilling: true,
      contextWindow: '200k token',
      latency: 'Veloce / Ibrido',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      badge: 'Billed',
      description: 'Risposte quasi istantanee, ideale per parsing continuo di dati e feedback brevi.',
      requiresBilling: true,
      contextWindow: '200k token',
      latency: 'Ultra-rapido',
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      badge: 'Billed',
      description: 'Capacità eccellente di redazione email commerciali, proposte e analisi clienti.',
      requiresBilling: true,
      contextWindow: '200k token',
      latency: 'Veloce',
    },
  ],
  openrouter: [
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash Exp (Free)',
      badge: 'Free',
      description: 'Accesso gratuito tramite OpenRouter senza costi a consumo.',
      requiresBilling: false,
      contextWindow: '1M token',
      latency: 'Ultra-rapido',
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Llama 3.3 70B Instruct (Free)',
      badge: 'Free',
      description: 'Modello Open Source ad alte prestazioni ospitato gratuitamente su OpenRouter.',
      requiresBilling: false,
      contextWindow: '128k token',
      latency: 'Rapido',
    },
    {
      id: 'deepseek/deepseek-r1:free',
      name: 'DeepSeek R1 (Free)',
      badge: 'Free',
      description: 'Ragionamento Open Source CoT gratuito per problem solving commerciale.',
      requiresBilling: false,
      contextWindow: '64k token',
      latency: 'Pensiero',
    },
    {
      id: 'anthropic/claude-3.7-sonnet',
      name: 'Claude 3.7 Sonnet (Router Billed)',
      badge: 'Billed',
      description: 'Fatturazione a consumo scalata dal saldo unico di OpenRouter.',
      requiresBilling: true,
      contextWindow: '200k token',
      latency: 'Veloce',
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o (Router Billed)',
      badge: 'Billed',
      description: 'Chiamata a OpenAI tramite credito centralizzato su OpenRouter.',
      requiresBilling: true,
      contextWindow: '128k token',
      latency: 'Veloce',
    },
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile (Free Tier)',
      badge: 'Free',
      description: 'Inference su chip LPU Groq con 30 RPM gratuiti e velocità di oltre 250 tok/s.',
      requiresBilling: false,
      contextWindow: '128k token',
      latency: 'Ultra-LPU',
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant (Free Tier)',
      badge: 'Free',
      description: 'Latenza minima assoluta (sub-100ms), eccellente per classificazione rapida.',
      requiresBilling: false,
      contextWindow: '128k token',
      latency: 'Istantaneo (750 tok/s)',
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B (Free Tier)',
      badge: 'Free',
      description: 'Architettura Mixture-of-Experts gratuita per compiti commerciali generici.',
      requiresBilling: false,
      contextWindow: '32k token',
      latency: 'Rapido',
    },
  ],
  nvidia: [
    {
      id: 'meta/llama-3.3-70b-instruct',
      name: 'NVIDIA Llama 3.3 70B (Free Credits)',
      badge: 'Free',
      description: 'Include 1000 chiamate/crediti gratuiti generati all\'attivazione dell\'account NVIDIA.',
      requiresBilling: false,
      contextWindow: '128k token',
      latency: 'Rapido',
    },
    {
      id: 'deepseek-ai/deepseek-r1',
      name: 'NVIDIA DeepSeek R1',
      badge: 'Billed',
      description: 'Microservizio NIM ottimizzato su cluster NVIDIA TensorRT-LLM.',
      requiresBilling: true,
      contextWindow: '64k token',
      latency: 'Pensiero',
    },
  ],
  custom: [
    {
      id: 'llama3.2',
      name: 'Ollama Llama 3.2 (100% Locale Free)',
      badge: 'Free',
      description: 'Eseguito direttamente sul tuo computer con Ollama. Zero costi, massima privacy offline.',
      requiresBilling: false,
      contextWindow: 'Illimitato Locale',
      latency: 'Hardware locale',
    },
    {
      id: 'mistral',
      name: 'Ollama Mistral 7B (Locale Free)',
      badge: 'Free',
      description: 'Modello locale compatto e veloce per estrazione dati senza connessione internet.',
      requiresBilling: false,
      contextWindow: '32k token',
      latency: 'Hardware locale',
    },
    {
      id: 'deepseek-r1:8b',
      name: 'Ollama DeepSeek R1 8B (Locale Free)',
      badge: 'Free',
      description: 'Ragionamento avanzato locale senza costi di API o fatturazione.',
      requiresBilling: false,
      contextWindow: '64k token',
      latency: 'Locale CoT',
    },
  ],
};

export const DEFAULT_AI_CONFIGS: Record<AIProviderType, { name: string; defaultBaseUrl: string; defaultModel: string }> = {
  gemini: {
    name: 'Google Gemini (Flash Lite)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.5-flash-lite',
  },
  openai: {
    name: 'OpenAI (ChatGPT / GPT-4o)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    name: 'Anthropic (Claude 3.7 / 3.5)',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-7-sonnet',
  },
  openrouter: {
    name: 'OpenRouter (Multi-Model Unified)',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
  },
  nvidia: {
    name: 'NVIDIA NIM (Microservices AI)',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
  },
  groq: {
    name: 'Groq (Ultra-Low Latency LPU)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  custom: {
    name: 'Custom OpenAI-Compatible (Ollama / LocalLLM / vLLM)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
  },
};

const LOCAL_STORAGE_KEY_AI_CONFIG = 'hubc_crm_ai_provider_config_v2';

export function getSavedAIConfig(): AIProviderConfig {
  if (typeof window === 'undefined') {
    return {
      provider: 'gemini',
      apiKey: '',
      baseUrl: DEFAULT_AI_CONFIGS.gemini.defaultBaseUrl,
      model: 'gemini-3.5-flash-lite',
      temperature: 0.3,
      isBillingActive: false,
    };
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_AI_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure gemini defaults to gemini-3.5-flash-lite if old version was saved
      if (parsed.provider === 'gemini' && (!parsed.model || parsed.model.includes('2.0') || parsed.model.includes('2.5'))) {
        parsed.model = 'gemini-3.5-flash-lite';
      }
      return parsed;
    }
  } catch (e) {}

  return {
    provider: 'gemini',
    apiKey: '',
    baseUrl: DEFAULT_AI_CONFIGS.gemini.defaultBaseUrl,
    model: 'gemini-3.5-flash-lite',
    temperature: 0.3,
    isBillingActive: false,
  };
}

export function saveAIConfig(config: AIProviderConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_AI_CONFIG, JSON.stringify(config));
  } catch (e) {}
}

export async function executeUniversalAI(
  prompt: string,
  config: AIProviderConfig,
  contextData: any
): Promise<{ success: boolean; reply: string; raw?: any; isBillingError?: boolean }> {
  // If no API key configured, use built-in autonomous intelligence parser
  if (!config.apiKey && config.provider !== 'custom') {
    return {
      success: true,
      reply: 'Motore di fallback autonomo: per abilitare il modello generativo cloud inserisci la tua API Key nelle Impostazioni.',
    };
  }

  try {
    const systemPrompt = `Sei l'Agente AI Commerciale Direzionale di Hub Commerciale.
Supporti la direzione commerciale e i venditori nell'analisi della pipeline, nella prioritizzazione dei lead e nella gestione delle opportunità multi-brand.
Analizza l'istruzione dell'utente e la pipeline commerciale. Rispondi in italiano in modo estremamente professionale ed esecutivo.
Dati correnti della pipeline: ${JSON.stringify(contextData || {})}`;

    // 1. Google Gemini Provider
    if (config.provider === 'gemini') {
      const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nComando commerciale: ${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || `Gemini API HTTP ${res.status}`;
        const isBilling = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('resource_exhausted');
        return {
          success: false,
          reply: `Errore Gemini (${res.status}): ${msg}`,
          isBillingError: isBilling,
        };
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta generata';
      return { success: true, reply };
    }

    // 2. Anthropic Claude Provider
    if (config.provider === 'anthropic') {
      const url = `${config.baseUrl}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: config.model,
          system: systemPrompt,
          max_tokens: 1024,
          temperature: config.temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || `Anthropic API HTTP ${res.status}`;
        const isBilling = msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance') || msg.toLowerCase().includes('billing');
        return {
          success: false,
          reply: `Errore Anthropic (${res.status}): ${msg}`,
          isBillingError: isBilling,
        };
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Nessuna risposta da Claude';
      return { success: true, reply };
    }

    // 3. OpenAI / OpenRouter / NVIDIA NIM / Groq / Custom OpenAI-Compatible
    const url = `${config.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://omnihub.commerciale.it';
      headers['X-Title'] = 'Hub Commerciale AI';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `${config.provider} API HTTP ${res.status}`;
      const isBilling = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('insufficient_quota');
      return {
        success: false,
        reply: `Errore ${config.provider} (${res.status}): ${msg}`,
        isBillingError: isBilling,
      };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Nessuna risposta dal modello';
    return { success: true, reply };
  } catch (err: any) {
    return {
      success: false,
      reply: `Errore chiamata ${config.provider}: ${err.message}`,
    };
  }
}
