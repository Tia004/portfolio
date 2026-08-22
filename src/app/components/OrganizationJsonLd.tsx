import type { Lang } from '@/lib/translations';

/**
 * Social profile URLs (sameAs) for Tia Designs. Populate with the real
 * profile URLs the client provides — e.g.
 *   'https://www.instagram.com/tiadesigns',
 *   'https://www.behance.net/tiadesigns',
 *   'https://t.me/tiadesigns',
 *   'https://www.youtube.com/@tiadesigns',
 *   'https://www.linkedin.com/in/tiadesigns',
 * etc. Leave the array empty if none are provided: the schema stays valid
 * (sameAs omitted) and only verified contacts are emitted.
 */
const SOCIAL_PROFILES: string[] = [
  // Add profile URLs here once confirmed.
];

const SITE_URL = 'https://tiadesigns.it';

/**
 * Schema.org Organization + WebSite JSON-LD, generated server-side (no
 * 'use client' — plain markup crawlers can read without JavaScript).
 *
 * The same Organization node is referenced by both the WebSite (publisher)
 * and the FAQPage schema emitted on the same pages, so Google sees one
 * consistent entity graph. `</` is escaped as `\u003c` so no string can
 * break out of the script tag, and `inLanguage` mirrors the page language.
 */
export default function OrganizationJsonLd({ lang }: { lang: Lang }) {
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Tia Designs',
    legalName: 'Tia Chinaglia',
    url: SITE_URL,
    email: 'info@tiadesigns.it',
    telephone: '+393318821334',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Mantova',
      addressRegion: 'Lombardia',
      addressCountry: 'IT',
    },
    ...(SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES } : {}),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'info@tiadesigns.it',
        telephone: '+393318821334',
        areaServed: 'IT',
        availableLanguage: ['Italian', 'English', 'Spanish'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        url: 'https://wa.me/393318821334',
        areaServed: 'IT',
        availableLanguage: ['Italian'],
      },
    ],
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Tia Designs',
    inLanguage: lang,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [organization, website],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
