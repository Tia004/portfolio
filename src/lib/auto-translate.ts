/**
 * Auto-Translation Helper for Tia Designs Portfolio
 * Seamlessly translates projects, FAQs, and reviews from Italian to English and Spanish.
 * Uses Groq (LLaMA 3.3) / Gemini when configured, with a robust free Google Translate fallback.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Free Google Translate fallback (instant, no API key required)
 */
async function fallbackGoogleTranslate(text: string, targetLang: 'en' | 'es'): Promise<string> {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).join('').trim();
    }
    return text;
  } catch (err) {
    console.warn(`[AutoTranslate] Fallback error for ${targetLang}:`, err);
    return text;
  }
}

/**
 * Translate using Groq LLaMA 3.3
 */
async function groqTranslate(text: string, targetLang: 'en' | 'es', context?: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
  const langName = targetLang === 'en' ? 'English' : 'Spanish';
  const prompt = `You are a professional translator for a luxury portfolio website (Tia Designs).
Translate the following Italian text into natural, elegant ${langName}.
${context ? `Context: ${context}` : ''}
IMPORTANT: Output ONLY the translated text without quotes, explanation, or conversational intro.

Italian text:
${text}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty Groq response');
  return content;
}

/**
 * Translate using Gemini
 */
async function geminiTranslate(text: string, targetLang: 'en' | 'es', context?: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const langName = targetLang === 'en' ? 'English' : 'Spanish';
  const prompt = `Translate this Italian text into natural, professional ${langName} for a creative portfolio. Output ONLY the translation.
${context ? `Context: ${context}` : ''}
Text: ${text}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) throw new Error('Empty Gemini response');
  return content;
}

/**
 * Main translation function with cascaded fallbacks
 */
export async function translateText(text: string, targetLang: 'en' | 'es', context?: string): Promise<string> {
  if (!text || !text.trim()) return '';

  if (GROQ_API_KEY) {
    try {
      return await groqTranslate(text, targetLang, context);
    } catch {
      // Fallback
    }
  }

  if (GEMINI_API_KEY) {
    try {
      return await geminiTranslate(text, targetLang, context);
    } catch {
      // Fallback
    }
  }

  return await fallbackGoogleTranslate(text, targetLang);
}

/**
 * Auto-translate an entire project
 */
export async function autoTranslateProject(project: {
  title: string;
  description: string;
  longDescription?: string | null;
}) {
  const [titleEn, titleEs, descriptionEn, descriptionEs] = await Promise.all([
    translateText(project.title, 'en', 'Project title'),
    translateText(project.title, 'es', 'Project title'),
    translateText(project.description, 'en', 'Short project description'),
    translateText(project.description, 'es', 'Short project description'),
  ]);

  let longDescriptionEn: string | undefined = undefined;
  let longDescriptionEs: string | undefined = undefined;

  if (project.longDescription && project.longDescription.trim()) {
    [longDescriptionEn, longDescriptionEs] = await Promise.all([
      translateText(project.longDescription, 'en', 'Detailed project overview'),
      translateText(project.longDescription, 'es', 'Detailed project overview'),
    ]);
  }

  return {
    titleEn,
    titleEs,
    descriptionEn,
    descriptionEs,
    longDescriptionEn,
    longDescriptionEs,
  };
}

/**
 * Auto-translate an entire FAQ entry
 */
export async function autoTranslateFaq(faq: {
  questionIt: string;
  answerIt: string;
}) {
  const [questionEn, questionEs, answerEn, answerEs] = await Promise.all([
    translateText(faq.questionIt, 'en', 'FAQ question'),
    translateText(faq.questionIt, 'es', 'FAQ question'),
    translateText(faq.answerIt, 'en', 'FAQ answer'),
    translateText(faq.answerIt, 'es', 'FAQ answer'),
  ]);

  return {
    questionEn,
    questionEs,
    answerEn,
    answerEs,
  };
}

/**
 * Auto-translate a client review
 */
export async function autoTranslateReview(review: {
  quoteIt: string;
}) {
  const [quoteEn, quoteEs] = await Promise.all([
    translateText(review.quoteIt, 'en', 'Client testimonial / review'),
    translateText(review.quoteIt, 'es', 'Client testimonial / review'),
  ]);

  return {
    quoteEn,
    quoteEs,
  };
}
