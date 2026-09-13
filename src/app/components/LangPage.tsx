import HomeShell from './HomeShell';
import FAQJsonLd from './FAQJsonLd';
import OrganizationJsonLd from './OrganizationJsonLd';
import type { Lang } from '@/lib/translations';

// ── Shared body of the two real per-language pages ────────────────────────
// /en and /es are their own routes (app/en/page.tsx, app/es/page.tsx) rather
// than one dynamic `[lang]` segment, and that is deliberate.
//
// A dynamic `[lang]` route matches ANY single segment, so `/pippo` — the exact
// shape of a typo people actually make — was captured by it, and the 404 it
// raised was rendered from inside a matched route: the response carried a
// correct 404 status but an EMPTY HTML body that only the client bundle could
// fill. Multi-segment paths (`/a/b`) served the server-rendered 404 correctly,
// because nothing matched them. Closing the dynamic segment removes the whole
// class of problem: with no `[lang]` route, anything unknown falls through to
// app/not-found.tsx, which is server-rendered for crawlers and for anyone whose
// JavaScript never arrived.
//
// The language is still resolved server-side from the `x-lang` header the proxy
// sets from the URL prefix, so /en and /es behave exactly as before (real URLs,
// per-language metadata, hreflang) — the segment stops being dynamic, nothing
// else changes.

export default function LangPage({ lang }: { lang: Lang }) {
  return (
    <>
      <OrganizationJsonLd lang={lang} />
      <FAQJsonLd lang={lang} />
      <HomeShell />
    </>
  );
}
