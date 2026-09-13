import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CaseStudyPage from '@/app/components/CaseStudyPage';
import { caseStudyMetadata, caseStudySlugs, getCaseStudy } from '@/lib/case-studies';

type Props = { params: Promise<{ slug: string }> };

// Pre-render every case study at build time: these pages are the ones that must
// be cheap for a crawler to fetch and instant for a visitor arriving from a
// search result.
export function generateStaticParams() {
  return caseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getCaseStudy('it', slug);
  if (!project) return {};
  return caseStudyMetadata('it', project);
}

export default async function ItalianCaseStudy({ params }: Props) {
  const { slug } = await params;
  const project = getCaseStudy('it', slug);
  // A slug nobody has: the branded 404, with a real 404 status — not an empty
  // shell that only the client bundle could fill.
  if (!project) notFound();
  return <CaseStudyPage lang="it" project={project} />;
}
