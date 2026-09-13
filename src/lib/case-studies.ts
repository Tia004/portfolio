// ── Case studies ──────────────────────────────────────────────────────────
// A portfolio piece per URL. Until now every project lived only inside a modal
// on the home page, so none of them was a page a search engine could rank: the
// work was the site's best asset and it was invisible.
//
// The slug is the project `id` — already stable and URL-safe ('gsa-hotels',
// 'design-editoriale-2b') — and it is used in EVERY language, so
// /progetti/pcs and /en/progetti/pcs are the same project at the same path.
// Localising the slug would mean a 404 for anyone who guessed the URL, which
// is the opposite of what this page is for.
//
// The copy is not duplicated here: titles, descriptions, tags and galleries all
// come from the per-language project list that was already translated
// (lib/translations). This module only adds what a PAGE needs and a modal did
// not: the URL, the neighbours, and the structured data.

import { getProjects, t, type Lang, type ProjectData } from './translations';
import { SITE_URL, localizedUrl, pageAlternates } from './seo';

/** Language-less path of a case study, e.g. '/progetti/pcs'. */
export function caseStudyPath(id: string): string {
  return `/progetti/${id}`;
}

/** Every project id, in the order the portfolio lists them. */
export function caseStudySlugs(): string[] {
  return getProjects('it').map((project) => project.id);
}

/** The project a slug points at, localized. `null` means a real 404. */
export function getCaseStudy(lang: Lang, slug: string): ProjectData | null {
  return getProjects(lang).find((project) => project.id === slug) ?? null;
}

/**
 * Neighbours for the "altri progetti" block: same category first (a web project
 * next to a web project reads as competence), then the rest. These links are
 * the internal crawl path between the case studies — without them each page is
 * an island reachable only from the sitemap.
 */
export function relatedCaseStudies(lang: Lang, slug: string, limit = 3): ProjectData[] {
  const all = getProjects(lang);
  const current = all.find((project) => project.id === slug);
  if (!current) return all.slice(0, limit);
  const sameCategory = all.filter((p) => p.id !== slug && p.category === current.category);
  const others = all.filter((p) => p.id !== slug && p.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}

/**
 * Title, description, canonical, hreflang and OpenGraph for one case study.
 *
 * The title is built here rather than in each route so /progetti/x, /en/progetti/x
 * and /es/progetti/x cannot end up labelled differently, and the canonical comes
 * from the shared helper — the reason a new page gets indexed at all instead of
 * pointing back at the home page.
 */
export function caseStudyMetadata(lang: Lang, project: ProjectData) {
  const title = `${project.title} — ${t('progetto.intro_label', lang)} | Tia Designs`;
  return {
    title,
    description: project.description,
    alternates: pageAlternates(lang, caseStudyPath(project.id)),
    openGraph: {
      title,
      description: project.description,
      type: 'article' as const,
      images: [{ url: absoluteThumbnail(project), alt: project.title }],
    },
  };
}

/**
 * Hosts that are not pages PageSpeed can analyse. A video, a repository or a
 * social profile has no performance score, and offering to measure it would be
 * a broken promise dressed as proof.
 */
const NON_MEASURABLE_HOSTS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'github.com',
  'figma.com',
  'behance.net',
  'instagram.com',
  'linkedin.com',
];

/** The domain of a live project, for display ('www.' dropped). Null if invalid. */
export function siteHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Deep link to Google's PageSpeed Insights for a live project, or null when the
 * URL is not an analysable page.
 *
 * This is the honest form of quantified proof: the number is produced by Google,
 * on a public report anyone can re-run, so the site does not have to assert a
 * result — and cannot be accused of inventing one. It answers the question a
 * buyer actually has ("will my site be fast?") with an instrument instead of a
 * promise.
 */
export function pageSpeedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    const host = hostname.replace(/^www\./, '').toLowerCase();
    if (NON_MEASURABLE_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      return null;
    }
    return `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

/** Absolute URL of a project thumbnail, for OpenGraph and the JSON-LD image. */
export function absoluteThumbnail(project: ProjectData): string {
  return project.thumbnail.startsWith('http') ? project.thumbnail : `${SITE_URL}${project.thumbnail}`;
}

/**
 * The structured data of one case study: the work itself plus the breadcrumb
 * that places it under the home page. `creator` points at the Person node
 * emitted by OrganizationJsonLd on the home page — same @id, same graph — so an
 * AI assistant reading this page learns who built it, not just that it exists.
 *
 * Pure: no React, no I/O, so it can be unit-tested against fixtures.
 */
export function caseStudyJsonLd(lang: Lang, project: ProjectData) {
  const url = localizedUrl(lang, caseStudyPath(project.id));
  const home = localizedUrl(lang, '');

  const work = {
    '@type': 'CreativeWork',
    '@id': `${url}#case-study`,
    name: project.title,
    description: project.description,
    url,
    inLanguage: lang,
    creator: { '@id': `${SITE_URL}/#person` },
    ...(project.tags.length ? { keywords: project.tags.join(', ') } : {}),
    image: absoluteThumbnail(project),
    // The finished work, when it is live on its own domain: `sameAs` is how a
    // page says "this is the same entity as that", which is what connects the
    // case study to the real site a client can visit.
    ...(project.url ? { sameAs: [project.url] } : {}),
  };

  // Two levels, not three: there is no /progetti index page, and inventing a
  // breadcrumb step that 404s is worse than a short one.
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Tia Designs', item: home },
      { '@type': 'ListItem', position: 2, name: project.title, item: url },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [work, breadcrumb],
  };
}
