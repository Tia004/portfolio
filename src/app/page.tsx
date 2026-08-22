import HomeShell from './components/HomeShell';
import FAQJsonLd from './components/FAQJsonLd';
import OrganizationJsonLd from './components/OrganizationJsonLd';
import { DEFAULT_LANG } from '@/lib/translations';

export default function Home() {
  return (
    <>
      <OrganizationJsonLd lang={DEFAULT_LANG} />
      <FAQJsonLd lang={DEFAULT_LANG} />
      <HomeShell />
    </>
  );
}
