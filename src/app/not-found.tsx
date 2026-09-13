import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ErrorShell from './components/ErrorShell';
import type { Lang } from '@/lib/translations';
import { LANGS } from '@/lib/translations';

// ── 404 ───────────────────────────────────────────────────────────────────
// Anything that does not match a route lands here (Next renders this file with
// a real 404 status, which is what tells search engines the URL is gone rather
// than broken). It replaced Next's default white page.
//
// Localized metadata: the layout already reads the `x-lang` header that the
// proxy sets from the language cookie, so the title of the 404 matches the
// language the visitor is actually browsing in — a 404 is a bad moment, but not
// an excuse to switch language on someone.

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const xLang = headersList.get('x-lang') as Lang | null;
  const lang: Lang = xLang && LANGS.some((l) => l.code === xLang) ? xLang : 'it';

  const titles: Record<Lang, string> = {
    it: 'Pagina non trovata (404) | Tia Designs',
    en: 'Page not found (404) | Tia Designs',
    es: 'Página no encontrada (404) | Tia Designs',
  };
  const descriptions: Record<Lang, string> = {
    it: 'La pagina richiesta non esiste o è stata spostata. Torna alla home di Tia Designs.',
    en: 'The requested page does not exist or has moved. Back to the Tia Designs home page.',
    es: 'La página solicitada no existe o se ha movido. Vuelve al inicio de Tia Designs.',
  };

  return {
    title: titles[lang],
    description: descriptions[lang],
    // Never indexed: a 404 has no content of its own, and letting it into the
    // index would put an apologetic page in front of a real one.
    robots: { index: false, follow: false },
  };
}

export default function NotFound() {
  return <ErrorShell variant="404" />;
}
