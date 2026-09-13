import type { Lang } from '@/lib/translations';
import { getPricingOnetime, getReviews, REVIEWS_DISPLAYED } from '@/lib/translations';

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
 * Euro value of a localized price label ("1.750", "Da €3.250", "from €1,200")
 * → 1750. The labels carry separators and currency symbols, so the digits are
 * extracted instead of parsed. Returns 0 when there is no number, and the
 * caller drops the price rather than publishing a wrong one.
 */
function euroValue(label?: string): number {
  if (!label) return 0;
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

/**
 * Schema.org JSON-LD for the public pages, generated server-side (no
 * 'use client' — plain markup crawlers can read without JavaScript).
 *
 * Four linked nodes:
 *   • Organization  — the entity Google/AI assistants attach the brand to;
 *   • Person — the professional behind it (founder of the Organization and of
 *     the business). "Chi mi fa un sito a Mantova" is a question about a
 *     person: without this node the answer can only be a faceless studio;
 *   • ProfessionalService — the actual business: what it does, WHERE it works
 *     (Mantova and province, Lombardia, all of Italy and remote) and the price
 *     range of each service category, read from the published price list.
 *     Without this node the site competes as an anonymous page; with it, the
 *     price is visible before the click;
 *   • WebSite — with the publishing organization, so the three stay one graph.
 *
 * `</` is escaped as `\u003c` so no string can break out of the script tag,
 * and `inLanguage` mirrors the page language.
 */
export default function OrganizationJsonLd({ lang }: { lang: Lang }) {
  // Built from the onetime price list, which is the authoritative breakdown
  // the page itself renders: one Service per category, with an AggregateOffer
  // spanning the entry and top tier of that category.
  const categories = getPricingOnetime(lang);
  const organizationId = `${SITE_URL}/#organization`;
  const businessId = `${SITE_URL}/#business`;
  const personId = `${SITE_URL}/#person`;

  // The SAME list the reviews section renders, sliced to the SAME window
  // (HomeShell shows the first REVIEWS_DISPLAYED cards). Markup and visible
  // content have to stay in lockstep: rating a page up with reviews that are
  // not on it is a structured-data violation, not a growth trick. The slice
  // limit lives in translations.ts so the two cannot drift apart.
  const reviews = getReviews(lang).slice(0, REVIEWS_DISPLAYED);
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviewCount
    : 0;

  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
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
    founder: { '@id': personId },
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

  // ── The business itself ──────────────────────────────────────────────────
  // Deliberately city-level: the operating address is a private home, and the
  // full street is never published (it appears only on contracts and invoices).
  const business = {
    '@type': 'ProfessionalService',
    '@id': businessId,
    name: 'Tia Designs',
    description:
      lang === 'en'
        ? 'Design, development, software and video production studio: custom websites, e-commerce, web apps and video content, from concept to publication.'
        : lang === 'es'
          ? 'Estudio de diseño, desarrollo, software y producción de vídeo: webs a medida, e-commerce, aplicaciones web y contenido de vídeo, del concepto a la publicación.'
          : 'Studio di design, sviluppo, software e produzione video: siti web su misura, e-commerce, applicazioni web e contenuti video, dal concept alla pubblicazione.',
    url: SITE_URL,
    email: 'info@tiadesigns.it',
    telephone: '+393318821334',
    parentOrganization: { '@id': organizationId },
    founder: { '@id': personId },
    employee: { '@id': personId },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Mantova',
      addressRegion: 'Lombardia',
      addressCountry: 'IT',
    },
    // Local + remote: the office is in Mantova, the work is everywhere.
    areaServed: [
      { '@type': 'City', name: 'Mantova' },
      { '@type': 'AdministrativeArea', name: 'Lombardia' },
      { '@type': 'Country', name: 'Italia' },
    ],
    knowsLanguage: ['it', 'en', 'es'],
    knowsAbout:
      lang === 'en'
        ? ['Web design', 'Web development', 'E-commerce', 'Web applications', 'Software', 'UI/UX design', 'SEO', 'Video production', 'Motion graphics']
        : lang === 'es'
          ? ['Diseño web', 'Desarrollo web', 'E-commerce', 'Aplicaciones web', 'Software', 'Diseño UI/UX', 'SEO', 'Producción de vídeo', 'Motion graphics']
          : ['Web design', 'Sviluppo web', 'E-commerce', 'Applicazioni web', 'Software', 'UI/UX design', 'SEO', 'Produzione video', 'Motion graphics'],
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Bonifico, carta di credito, pagamento a rate',
    slogan:
      lang === 'en'
        ? 'The perfect balance between aesthetics and engineering'
        : lang === 'es'
          ? 'El equilibrio perfecto entre estética e ingeniería'
          : 'Il perfetto equilibrio tra estetica e ingegneria',
    // ── Trust signals ─────────────────────────────────────────────────────
    // The rating the page shows, derived from the very reviews it renders, so
    // a search result (and an AI answer) can quote "5.0 from 8 clients"
    // instead of nothing at all.
    ...(reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: averageRating.toFixed(1),
            // reviewCount, not ratingCount: these are written testimonials.
            reviewCount: String(reviewCount),
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.map((item, index) => ({
            '@type': 'Review',
            '@id': `${SITE_URL}/#review-${index + 1}`,
            // The business being reviewed, by @id — same graph, same node.
            itemReviewed: { '@id': businessId },
            author: {
              '@type': 'Person',
              name: item.name,
              // e.g. 'PCS Mantova', 'Content Creator': who the reviewer is.
              jobTitle: item.role,
            },
            reviewRating: {
              '@type': 'Rating',
              ratingValue: item.stars,
              bestRating: 5,
              worstRating: 1,
            },
            reviewBody: item.text,
            inLanguage: lang,
          })),
        }
      : {}),
    // The prices that are already printed on the page, so a search result (and
    // an AI answer) can quote a range instead of "contact us".
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: lang === 'en' ? 'Price list' : lang === 'es' ? 'Listado de precios' : 'Listino',
      itemListElement: categories.map((category) => {
        const prices = category.tiers
          .map((tier) => euroValue(tier.priceLabel ?? tier.price))
          .filter((value) => value > 0);
        return {
          '@type': 'Service',
          name: category.label,
          description: category.subtitle,
          serviceType: category.label,
          provider: { '@id': organizationId },
          areaServed: { '@type': 'City', name: 'Mantova' },
          // Price RANGE, not a made-up single figure: the page quotes a starting
          // price per tier, so the schema quotes the spread of those tiers.
          ...(prices.length
            ? {
                offers: {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'EUR',
                  lowPrice: String(Math.min(...prices)),
                  highPrice: String(Math.max(...prices)),
                  offerCount: String(prices.length),
                },
              }
            : {}),
        };
      }),
    },
  };

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: 'Tia Chinaglia',
    jobTitle:
      lang === 'en'
        ? 'Founder, designer and developer'
        : lang === 'es'
          ? 'Fundador, diseñador y desarrollador'
          : 'Fondatore, designer e sviluppatore',
    description:
      lang === 'en'
        ? 'Founder of Tia Designs. Designs and builds the websites, web apps and video content himself: every project is handled directly, from concept to publication.'
        : lang === 'es'
          ? 'Fundador de Tia Designs. Diseña y construye personalmente las webs, aplicaciones web y contenidos de vídeo: cada proyecto se gestiona directamente, del concepto a la publicación.'
          : 'Fondatore di Tia Designs. Progetta e costruisce personalmente siti, applicazioni web e contenuti video: ogni progetto è seguito direttamente, dal concept alla pubblicazione.',
    url: SITE_URL,
    email: 'info@tiadesigns.it',
    worksFor: { '@id': organizationId },
    knowsLanguage: ['it', 'en', 'es'],
    ...(SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES } : {}),
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Tia Designs',
    inLanguage: lang,
    publisher: { '@id': organizationId },
  };

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [organization, business, person, website],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
