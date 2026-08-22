import { getFaqs, type Lang } from '@/lib/translations';

/**
 * Schema.org FAQPage JSON-LD, generated server-side from the exact same 20
 * FAQs rendered in the FAQ section (this file has no 'use client' — it emits
 * plain markup that crawlers can read without JavaScript).
 *
 * `</` is escaped as `\u003c` so no string can ever break out of the script
 * tag, and `inLanguage` mirrors the page language (/ → it, /en, /es).
 */
export default function FAQJsonLd({ lang }: { lang: Lang }) {
  const faqs = getFaqs(lang);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
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
