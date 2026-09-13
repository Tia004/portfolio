import { caseStudyJsonLd } from '@/lib/case-studies';
import type { Lang, ProjectData } from '@/lib/translations';

/**
 * JSON-LD for one case study: the work plus its breadcrumb. Server-rendered
 * plain markup (no 'use client'), so crawlers read it without JavaScript.
 * `</` is escaped so no string can break out of the script tag.
 */
export default function CaseStudyJsonLd({ lang, project }: { lang: Lang; project: ProjectData }) {
  const schema = caseStudyJsonLd(lang, project);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
