import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  translateText,
  autoTranslateProject,
  autoTranslateFaq,
  autoTranslateReview,
} from '@/lib/auto-translate';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, text, targetLang, data } = body;

    if (type === 'project' && data) {
      const translated = await autoTranslateProject({
        title: data.title || '',
        description: data.description || '',
        longDescription: data.longDescription || null,
      });
      return NextResponse.json(translated);
    }

    if (type === 'faq' && data) {
      const translated = await autoTranslateFaq({
        questionIt: data.questionIt || '',
        answerIt: data.answerIt || '',
      });
      return NextResponse.json(translated);
    }

    if (type === 'review' && data) {
      const translated = await autoTranslateReview({
        quoteIt: data.quoteIt || '',
      });
      return NextResponse.json(translated);
    }

    if (text && targetLang) {
      const translatedText = await translateText(text, targetLang);
      return NextResponse.json({ translated: translatedText });
    }

    return NextResponse.json({ error: 'Invalid translation payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/master/auto-translate:', error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}
