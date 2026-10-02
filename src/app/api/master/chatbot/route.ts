import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { DEFAULT_GEMINI_MODEL, DEFAULT_NVIDIA_MODEL, encryptProviderKey, getChatbotConfig } from '@/lib/chatbot-config';
import { isSameOriginRequest } from '@/lib/chat-security';

export const runtime = 'nodejs';

async function authorized() {
  const session = await getSession();
  return session?.username === 'master';
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const config = await getChatbotConfig();
    return NextResponse.json({
      customRules: config?.customRules || '',
      nvidiaModel: config?.nvidiaModel || DEFAULT_NVIDIA_MODEL,
      geminiModel: config?.geminiModel || DEFAULT_GEMINI_MODEL,
      nvidiaConfigured: Boolean(config?.nvidiaKeyEncrypted || process.env.NVIDIA_NIM_API_KEY),
      geminiConfigured: Boolean(config?.geminiKeyEncrypted || process.env.GEMINI_API_KEY),
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      keyStorageReady: Boolean(process.env.AI_KEYS_ENCRYPTION_KEY && process.env.AI_KEYS_ENCRYPTION_KEY.length >= 32),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Configurazione non disponibile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await authorized()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 20_000) return NextResponse.json({ error: 'Richiesta troppo grande' }, { status: 413 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const customRules = body.customRules;
    const nvidiaModel = body.nvidiaModel;
    const geminiModel = body.geminiModel;
    const nvidiaKey = body.nvidiaKey;
    const geminiKey = body.geminiKey;
    const removeNvidia = body.removeNvidia === true;
    const removeGemini = body.removeGemini === true;
    if (typeof customRules !== 'string' || customRules.length > 4000 ||
        typeof nvidiaModel !== 'string' || !/^[\w./-]{3,100}$/.test(nvidiaModel) ||
        typeof geminiModel !== 'string' || !/^[\w.-]{3,100}$/.test(geminiModel) ||
        (nvidiaKey !== undefined && (typeof nvidiaKey !== 'string' || nvidiaKey.length > 500)) ||
        (geminiKey !== undefined && (typeof geminiKey !== 'string' || geminiKey.length > 500))) {
      return NextResponse.json({ error: 'Valori non validi' }, { status: 400 });
    }
    const data: Record<string, string | null> = { customRules, nvidiaModel, geminiModel };
    if (removeNvidia) data.nvidiaKeyEncrypted = null;
    else if (typeof nvidiaKey === 'string' && nvidiaKey.trim()) data.nvidiaKeyEncrypted = encryptProviderKey(nvidiaKey.trim());
    if (removeGemini) data.geminiKeyEncrypted = null;
    else if (typeof geminiKey === 'string' && geminiKey.trim()) data.geminiKeyEncrypted = encryptProviderKey(geminiKey.trim());
    await prisma.chatbotConfig.upsert({
      where: { id: 'main' },
      create: { id: 'main', customRules, nvidiaModel, geminiModel,
        nvidiaKeyEncrypted: data.nvidiaKeyEncrypted ?? null, geminiKeyEncrypted: data.geminiKeyEncrypted ?? null },
      update: data,
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Salvataggio non riuscito. Verifica la chiave di cifratura e riprova.' }, { status: 500 });
  }
}
