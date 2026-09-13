import type { Metadata } from 'next';
import NewsletterActionPage from '@/app/components/NewsletterActionPage';

type Props = { searchParams: Promise<{ token?: string | string[]; esito?: string | string[] }> };

export const metadata: Metadata = {
  title: 'Confirma tu suscripción — Tia Designs',
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

export default async function NewsletterConfirmPage({ searchParams }: Props) {
  const params = await searchParams;
  return <NewsletterActionPage mode="confirm" lang="es" token={first(params.token)} esito={first(params.esito)} />;
}
