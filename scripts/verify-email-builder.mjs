// Verifies the branded-email builder — the piece the dashboard composer, the
// newsletter, the cron and the quote emails all go through.
//
// The modules are plain TypeScript with no runtime dependencies, so instead of
// pulling in a bundler we transpile them with the project's own `typescript`
// and require the result. What runs here is the exact code the server runs.
//
// Run: node scripts/verify-email-builder.mjs
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTsModules, ROOT } from './load-ts-module.mjs';

const { 'email-template': template, 'email-markdown': markdown } = loadTsModules([
  'email-markdown',
  'email-template',
]);
const { buildBrandedEmailHtml } = template;
const { renderEmailMarkdown, tealifyAnchors } = markdown;

// ── Harness ────────────────────────────────────────────────────────────────
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const count = (haystack, needle) => haystack.split(needle).length - 1;
const body = (md, opts = {}) => renderEmailMarkdown(md);
const email = (md, opts = {}) => buildBrandedEmailHtml({ bodyMarkdown: md, ...opts });

console.log('\n── Header: the logo, and nothing else ─────────────────────────');
{
  const html = email('Corpo del messaggio.');
  check('logo image present exactly once', count(html, 'TiaDesignsLogo-white.png') === 1, String(count(html, 'TiaDesignsLogo-white.png')));
  check('logo sits at 90×48 with alt text', /width="90" height="48" alt="Tia Designs"/.test(html));
  check('no text wordmark in the header', !/>Tia <span/.test(html));
  check('the old duplicated wordmark markup is gone', !html.includes('<span style="color:#2dd4bf;">Designs</span>'));
  // The complaint was specifically about the TOP of the email: the brand name
  // printed twice, glued together. Scope the assertion to the header, because
  // the footer legitimately names the brand in prose.
  const headerBlock = html.slice(html.indexOf('<!-- Header'), html.indexOf('<!-- Body'));
  check('header shows no visible brand text', !/>\s*Tia Designs\s*</.test(headerBlock), `${headerBlock.length} chars inspected`);
  check('header still identifies the sender via alt text', headerBlock.includes('alt="Tia Designs"'));
  check('a badge that repeats the brand is dropped', !html.includes('text-transform:uppercase; letter-spacing:0.5px'));
  const withBadge = email('Corpo.', { badgeText: 'Newsletter Ufficiale' });
  check('an informative badge is kept', withBadge.includes('Newsletter Ufficiale'));
}
console.log('\n── Markdown the toolbar produces ──────────────────────────────');
{
  check('## → h2', body('## Titolo sezione').includes('<h2 style="color:#ffffff; font-size:18px'));
  check('# → h1', body('# Titolo').includes('<h1'));
  check('### → h3', body('### Sotto titolo').includes('<h3'));
  check('- → bullet list', (() => { const h = body('- primo\n- secondo'); return h.includes('<ul') && count(h, '<li') === 2; })());
  check('* → bullet list', body('* uno\n* due').includes('<ul'));
  check('1. → ordered list', (() => { const h = body('1. primo\n2. secondo'); return h.includes('<ol') && count(h, '<li') === 2; })());
  check('> → blockquote', body('> citazione').includes('<blockquote'));
  check('--- → divider', body('---').includes('height:1px'));
  check('**bold** → strong', body('testo **forte** qui').includes('<strong style="color:#ffffff'));
  check('*italic* → em', body('testo *corsivo* qui').includes('<em style="color:#a7f3d0'));
  check('`code` → code', body('usa `npm run build`').includes('<code style='));
  check('~~strike~~ → line-through', body('~~no~~').includes('line-through'));
}
console.log('\n── Links: always teal ─────────────────────────────────────────');
{
  const md = body('Vedi [la documentazione](https://example.com/docs) ora.');
  check('[text](url) renders as an anchor', md.includes('<a href="https://example.com/docs"'));
  check('markdown link is teal', md.includes('color:#2dd4bf'));
  const bare = body('Sito: https://tiadesigns.it e mail info@tiadesigns.it');
  check('bare URL auto-linked', bare.includes('<a href="https://tiadesigns.it"'));
  check('bare email auto-linked', bare.includes('<a href="mailto:info@tiadesigns.it"'));
  check('markdown link to a bare email becomes mailto', body('[scrivimi](info@tiadesigns.it)').includes('href="mailto:info@tiadesigns.it"'));
  check('trailing period not swallowed', /href="https:\/\/tiadesigns\.it"/.test(body('Vai su https://tiadesigns.it.')));
  const pasted = body('<a href="https://x.it" style="color:#0000ff;font-weight:300;">blu</a>');
  check('a pasted blue link is forced teal', pasted.includes('color:#2dd4bf') && !pasted.includes('#0000ff'));
  check('other declarations of a pasted link survive', pasted.includes('font-weight:600'));
  const js = body('[clicca](javascript:alert(1))');
  check('javascript: URL is not emitted', !js.includes('javascript:alert') && !js.includes('href="'));
  check('tealifyAnchors handles anchors without attributes', tealifyAnchors('<a>testo</a>').includes('color:#2dd4bf'));
}
console.log('\n── Buttons ────────────────────────────────────────────────────');
{
  const block = body('[Bottone: Prenota una call](https://tiadesigns.it/#contatti)');
  check('button renders as a rounded pill', block.includes('border-radius:999px'));
  check('button has its own vertical space', block.includes('margin:26px 0') && block.includes('text-align:center'));
  check('button text is rendered', block.includes('Prenota una call'));
  check('button links to the target', block.includes('href="https://tiadesigns.it/#contatti"'));
  check('button label with markdown is not left as a literal marker', !block.includes('[Bottone:'));
  const inline = body('Testo prima [Bottone: Clicca](https://x.it) testo dopo');
  check('inline button does not break the paragraph', inline.includes('<p style=') && inline.includes('border-radius:999px'));
  const badButton = body('[Bottone: Rotto](javascript:alert(1))');
  check('button with a javascript: URL degrades to text', !badButton.includes('javascript:'));
  const cta = email('Corpo.', { ctaText: 'Vedi il progetto', ctaUrl: 'https://tiadesigns.it' });
  check('the template CTA is a pill too', cta.includes('padding:16px 36px; border-radius:999px'));
}
console.log('\n── Raw HTML from the composer inserts ────────────────────────');
{
  const img = body('<p align="center"><img src="https://x.it/a.gif" alt="GIF" /></p>');
  check('image/GIF insert survives', img.includes('<img src="https://x.it/a.gif"'));
  const script = body('<p>ciao</p><script>alert(1)</script>');
  check('script tag stripped', !script.includes('<script>'));
  const handler = body('<img src="https://x.it/a.png" onerror="alert(1)" />');
  check('event handlers stripped', !handler.includes('onerror'));
  const iframe = body('<iframe src="https://evil.test"></iframe>');
  check('iframe stripped', !iframe.includes('<iframe'));
  const mixed = body('## Titolo\n\nTesto normale.\n\n<p align="center"><img src="https://x.it/b.gif" /></p>');
  check('raw HTML block and markdown coexist', mixed.includes('<h2') && mixed.includes('<img src="https://x.it/b.gif"'));
  const multiline = body('<table>\n<tr><td>cella</td></tr>\n</table>');
  check('multi-line raw HTML stays intact', multiline.includes('<table>') && multiline.includes('</table>'));
}
console.log('\n── Template options ───────────────────────────────────────────');
{
  const greeting = email('Corpo.', { recipientName: 'Marco' });
  check('greeting uses the recipient name', greeting.includes('Ciao Marco,'));
  check('a name with markup is escaped', email('Corpo.', { recipientName: '<b>x</b>' }).includes('&lt;b&gt;x&lt;/b&gt;'));
  const pre = email('Corpo.', { preheaderText: 'Anteprima in inbox' });
  check('hidden preheader is rendered', pre.includes('display:none') && pre.includes('Anteprima in inbox'));
  check('no preheader block when unset', !email('Corpo.').includes('max-height:0'));
  const banner = email('Corpo.', { bannerUrl: 'https://x.it/anim.gif', bannerAlt: 'Animated' });
  check('optional banner image is rendered', banner.includes('src="https://x.it/anim.gif"'));
  check('no banner when unset', !email('Corpo.').includes('max-width:620px; height:auto'));
  const title = email('Corpo.', { title: 'Oggetto visivo' });
  check('title renders as an h1 in the body', title.includes('<h1 style="color:#ffffff'));
  check('every email is a full document', email('x').trim().startsWith('<!DOCTYPE html>'));
  check('the signature names the professional', email('x').includes('Mattia Chinaglia'));
  check('no street address anywhere in the email', !email('x').includes('Labriola'));
}
console.log('\n── Edge cases ─────────────────────────────────────────────────');
{
  check('empty message does not throw', typeof buildBrandedEmailHtml({ bodyMarkdown: '' }) === 'string');
  check('message with only whitespace does not throw', typeof buildBrandedEmailHtml({ bodyMarkdown: '   \n\n  ' }) === 'string');
  check('HTML in the body text is escaped', body('prezzo < 100 e > 50').includes('&lt; 100'));
  const tricky = body('a < b\n\n- item < c\n\n> quote < d');
  check('mixed markup does not corrupt output', tricky.includes('<ul') && tricky.includes('<blockquote'));
  const long = body(Array.from({ length: 200 }, (_, i) => `- voce ${i}`).join('\n'));
  check('a 200-item list renders', count(long, '<li') === 200);
  check('a paragraph followed by a heading splits correctly', body('Testo\n## Titolo').includes('<p style=') && body('Testo\n## Titolo').includes('<h2'));
}

rmSync(resolve(ROOT, 'node_modules/.cache/ts-modules'), { recursive: true, force: true });
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
