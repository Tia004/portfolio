import HomeShell from './components/HomeShell';
import FAQJsonLd from './components/FAQJsonLd';
import { DEFAULT_LANG } from '@/lib/translations';

export default function Home() {
  return (
    <>
      <FAQJsonLd lang={DEFAULT_LANG} />
      <HomeShell />
    </>
  );
}
