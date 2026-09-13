import type { Metadata } from 'next';
import NewsletterActionPage from '@/app/components/NewsletterActionPage';

type Props = { searchParams: Promise<{ token?: string | string[]; esito?: string | string[] }> };

// Action pages: they exist to be reached from an email, not to be found in a
// search result, and the URL carries a capability token.
export const metadata: Metadata = {
  title: 'Conferma la tua iscrizione — Tia Designs',
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

export default async function NewsletterConfirmPage({ searchParams }: Props) {
  const params = await searchParams;
  return <NewsletterActionPage mode="confirm" lang="it" token={first(params.token)} esito={first(params.esito)} />;
}
