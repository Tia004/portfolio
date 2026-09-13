// Verifies which language each URL is served in, with and without the stored
// language cookie.
//
// The rule the site documents (see the comment in src/proxy.ts): the PATH wins,
// and the cookie is a preference for the language-neutral ROOT only (`/`).
// Getting this wrong is invisible in a normal click-through and expensive in
// search results — `/progetti/gsa-hotels` is an Italian canonical URL, and
// answering it in Spanish ships Spanish content under an Italian canonical with
// <html lang="es">.
//
// Run: BASE_URL=http://localhost:3202 node scripts/verify-language-routing.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3202';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function langOf(path, cookie) {
  const response = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: `lang=${cookie}` } : {},
  });
  const html = await response.text();
  const match = html.match(/<html[^>]*\slang="([a-z-]+)"/i);
  return { status: response.status, lang: match ? match[1] : '(assente)' };
}

console.log('\n── La lingua della pagina segue l\u2019URL');

// The root is language-neutral: the stored preference decides.
check('cookie es + "/" → spagnolo (la preferenza vale sulla root)', (await langOf('/', 'es')).lang === 'es');
check('cookie en + "/" → inglese', (await langOf('/', 'en')).lang === 'en');
check('senza cookie + "/" → italiano (default)', (await langOf('/', null)).lang === 'it');

// A prefixed path is an explicit promise about the language below it.
check('cookie es + "/en/progetti/gsa-hotels" → inglese', (await langOf('/en/progetti/gsa-hotels', 'es')).lang === 'en');
check('cookie it + "/es/progetti/gsa-hotels" → spagnolo', (await langOf('/es/progetti/gsa-hotels', 'it')).lang === 'es');

// An UNPREFIXED path has an Italian canonical URL: it must be Italian, whatever
// the visitor stored — otherwise the shared/indexed URL shows another language.
check('cookie es + "/progetti/gsa-hotels" → italiano', (await langOf('/progetti/gsa-hotels', 'es')).lang === 'it');
check('cookie en + "/progetti/gsa-hotels" → italiano', (await langOf('/progetti/gsa-hotels', 'en')).lang === 'it');
check('cookie es + "/newsletter/conferma" → italiano', (await langOf('/newsletter/conferma', 'es')).lang === 'it');
// `/progetti` is not a route (only `/progetti/[slug]` exists), so this is the 404
// page: it must still be Italian, in the language of the path that does not exist.
check('cookie es + un 404 sotto un percorso senza prefisso → italiano', (await langOf('/progetti', 'es')).lang === 'it');

// The preference is stored ONLY by the language roots, so a deep link cannot
// silently overwrite what the visitor chose.
{
  const response = await fetch(`${BASE}/es/progetti/gsa-hotels`, { redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie') || '';
  check('un deep link /es/... non riscrive il cookie di lingua', !/lang=(it|en|es)/.test(setCookie), setCookie || 'nessun set-cookie');

  const root = await fetch(`${BASE}/es`, { redirect: 'manual' });
  const rootCookie = root.headers.get('set-cookie') || '';
  check('la root /es SÌ persiste la scelta', /lang=es/.test(rootCookie), rootCookie.slice(0, 60));
}

// `/it` is not a route: it redirects to the equivalent root path.
{
  const response = await fetch(`${BASE}/it/progetti/gsa-hotels`, { redirect: 'manual' });
  check('/it/... → redirect 308 alla versione senza prefisso', response.status === 308 && (response.headers.get('location') || '').endsWith('/progetti/gsa-hotels'), `status=${response.status} → ${response.headers.get('location')}`);
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Lingue servite correttamente da ogni URL.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);
