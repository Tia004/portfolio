import { notFound } from 'next/navigation';
import HomeShell from '../components/HomeShell';
import FAQJsonLd from '../components/FAQJsonLd';
import OrganizationJsonLd from '../components/OrganizationJsonLd';
import type { Lang } from '@/lib/translations';

const VALID_LANGS = new Set(['en', 'es']);

// Real per-language pages (/en, /es) so CrUX can collect LCP/CLS per URL.
// The language is resolved server-side via the `x-lang` header set by the
// proxy; this route only guards the segment, emits the localized FAQPage
// JSON-LD and renders the same HomeShell.
export default async function LangPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!VALID_LANGS.has(lang)) notFound();
  return (
    <>
      <OrganizationJsonLd lang={lang as Lang} />
      <FAQJsonLd lang={lang as Lang} />
      <HomeShell />
    </>
  );
}
