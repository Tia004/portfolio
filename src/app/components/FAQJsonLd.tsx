import { getFaqs, type Lang } from '@/lib/translations';

const SITE_URL = 'https://tiadesigns.it';

/**
 * Schema.org FAQPage JSON-LD, generated server-side from the exact same 20
 * FAQs rendered in the FAQ section (this file has no 'use client' — it emits
 * plain markup that crawlers can read without JavaScript).
 *
 * The FAQPage is given its own `@id` and linked to the Organization node
 * (emitted by OrganizationJsonLd on the same pages) via `mainEntityOfPage`:
 * JSON-LD merges entities across script tags by `@id` reference, so the
 * Organization, WebSite and FAQPage resolve into one connected entity graph
 * instead of three disjoint scripts.
 *
 * `</` is escaped as `\u003c` so no string can ever break out of the script
 * tag, and `inLanguage` mirrors the page language (/ → it, /en, /es).
 */
export default function FAQJsonLd({ lang }: { lang: Lang }) {
  const faqs = getFaqs(lang);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faqpage`,
    // Reciprocal of mainEntity below: declares the entity this FAQ belongs
    // to. Pointing at the Organization's @id joins this script to the graph
    // built by OrganizationJsonLd on the same page.
    mainEntityOfPage: { '@id': `${SITE_URL}/#organization` },
    inLanguage: lang,
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
