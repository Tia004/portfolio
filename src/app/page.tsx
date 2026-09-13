import type { Metadata } from 'next';
import HomeShell from './components/HomeShell';
import FAQJsonLd from './components/FAQJsonLd';
import OrganizationJsonLd from './components/OrganizationJsonLd';
import { DEFAULT_LANG } from '@/lib/translations';
import { pageAlternates } from '@/lib/seo';

// Italian home: canonical is the bare origin, and the hreflang cluster points
// at the same page in the other two languages (not at the other pages).
export const metadata: Metadata = { alternates: pageAlternates(DEFAULT_LANG, '') };

export default function Home() {
  return (
    <>
      <OrganizationJsonLd lang={DEFAULT_LANG} />
      <FAQJsonLd lang={DEFAULT_LANG} />
      <HomeShell />
    </>
  );
}
