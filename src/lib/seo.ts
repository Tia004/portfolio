// ── Canonical + hreflang, computed per page ───────────────────────────────
// The site is no longer a single URL, and these two tags are exactly what
// breaks when one page becomes many:
//
//   • a canonical inherited from the layout would point every new page at the
//     home page, and Google would read the new page as a duplicate of it —
//     open a service page and it quietly never gets indexed;
//   • hreflang inherited from the layout would declare every page an alternate
//     of the home in three languages, which consolidates them all back into
//     "/" instead of clustering the equivalents of the SAME page.
//
// So neither is hardcoded in the layout any more. Each page declares its own
// language-less `path` ('' for the home, '/progetti/pcs' for a case study) and
// this module derives the whole set from it. Because it is one function, the
// canonical, the hreflang cluster and the sitemap can never disagree.

import type { Lang } from './translations';

export const SITE_URL = 'https://tiadesigns.it';

/** Languages the site is published in. Italian is served at the root. */
export const SEO_LANGS = ['it', 'en', 'es'] as const satisfies readonly Lang[];

/**
 * The path of a page WITHOUT its language prefix: `''` for the home,
 * `'/progetti/pcs'` for a case study. Italian lives at the root, so the
 * language-less path is also the Italian URL.
 */
export type SitePath = string;

function normalize(path: SitePath): string {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Absolute URL of `path` in `lang`. The home keeps the bare origin. */
export function localizedUrl(lang: Lang, path: SitePath): string {
  const clean = normalize(path);
  if (lang === 'it') return `${SITE_URL}${clean}`;
  return `${SITE_URL}/${lang}${clean}`;
}

/**
 * The hreflang cluster for a page: the same page in every language, plus the
 * x-default Google uses to pick a fallback. `languages` in the Next metadata
 * API emits one <link rel="alternate"> per entry.
 */
export function languageAlternates(path: SitePath): Record<string, string> {
  return {
    it: localizedUrl('it', path),
    en: localizedUrl('en', path),
    es: localizedUrl('es', path),
    'x-default': localizedUrl('it', path),
  };
}

/** What a page passes to `metadata.alternates`. */
export function pageAlternates(lang: Lang, path: SitePath) {
  return {
    canonical: localizedUrl(lang, path),
    languages: languageAlternates(path),
  };
}

/** Canonical + hreflang for every language of one page, for the sitemap. */
export function sitemapEntry(
  path: SitePath,
  options: { lastModified?: Date; changeFrequency?: 'daily' | 'weekly' | 'monthly'; priority?: number } = {},
) {
  return SEO_LANGS.map((lang) => ({
    url: localizedUrl(lang, path),
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency ?? 'weekly',
    priority: options.priority ?? 0.8,
    alternates: { languages: languageAlternates(path) },
  }));
}
