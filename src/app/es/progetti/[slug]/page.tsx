import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CaseStudyPage from '@/app/components/CaseStudyPage';
import { caseStudyMetadata, caseStudySlugs, getCaseStudy } from '@/lib/case-studies';

type Props = { params: Promise<{ slug: string }> };

// Same slugs as the Italian and English routes.
export function generateStaticParams() {
  return caseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getCaseStudy('es', slug);
  if (!project) return {};
  return caseStudyMetadata('es', project);
}

export default async function SpanishCaseStudy({ params }: Props) {
  const { slug } = await params;
  const project = getCaseStudy('es', slug);
  if (!project) notFound();
  return <CaseStudyPage lang="es" project={project} />;
}
