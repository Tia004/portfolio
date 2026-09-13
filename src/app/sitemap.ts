import type { MetadataRoute } from 'next';
import { sitemapEntry } from '@/lib/seo';
import { caseStudyPath, caseStudySlugs } from '@/lib/case-studies';

// Generated from the content, not written by hand.
//
// The previous version listed three URLs — the three home pages — which was
// correct while the site WAS three URLs. A hand-written list does not fail
// loudly when the site grows: it just silently stops mentioning the new pages,
// and nothing is ever discovered. Now every case study added to the project
// list appears here, with its whole hreflang cluster, automatically.
export default function sitemap(): MetadataRoute.Sitemap {
  const home = sitemapEntry('', { priority: 1, changeFrequency: 'weekly' });

  const caseStudies = caseStudySlugs().flatMap((slug) =>
    sitemapEntry(caseStudyPath(slug), { priority: 0.7, changeFrequency: 'monthly' }),
  );

  return [...home, ...caseStudies];
}
