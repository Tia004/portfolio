import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CaseStudyPage from '@/app/components/CaseStudyPage';
import { caseStudyMetadata, caseStudySlugs, getCaseStudy } from '@/lib/case-studies';

type Props = { params: Promise<{ slug: string }> };

// Same slugs as the Italian route — one project, one path, three languages.
export function generateStaticParams() {
  return caseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getCaseStudy('en', slug);
  if (!project) return {};
  return caseStudyMetadata('en', project);
}

export default async function EnglishCaseStudy({ params }: Props) {
  const { slug } = await params;
  const project = getCaseStudy('en', slug);
  if (!project) notFound();
  return <CaseStudyPage lang="en" project={project} />;
}
