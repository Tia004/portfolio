import type { Metadata } from 'next';
import LangPage from '../components/LangPage';
import { pageAlternates } from '@/lib/seo';

// Spanish home. A real, explicit route — see components/LangPage for why this
// is not a dynamic `[lang]` segment.
export const metadata: Metadata = { alternates: pageAlternates('es', '') };

export default function SpanishHome() {
  return <LangPage lang="es" />;
}
