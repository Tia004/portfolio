// Verifies the text path from Telegram to the widget for TIA'S REPLIES.
//
// The bug this locks down: sanitizeChatText collapsed EVERY whitespace run to
// one space, so a multi-paragraph reply written in Telegram arrived at the
// widget as one unwieldy line. Tia's replies now go through sanitizeTiaText,
// which keeps the paragraph structure and still sheds anything dangerous.
//
// The three contracts:
//   1. formatting survives — newlines, paragraphs, tabs at line start;
//   2. safety does not regress — control chars, bidi overrides, invisibles,
//      HTML tags and dangerous schemes are gone either way;
//   3. the two transport paths (/reply and direct message) behave IDENTICALLY.
//
// Run: node scripts/verify-tia-text.mjs
import { loadTsModules } from './load-ts-module.mjs';

const MAX_LINE_CHARS = 2_000;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const { 'chat-security': security, 'tia-text': tiaText, 'chat-moderation': moderation } =
  loadTsModules(['chat-security', 'tia-text', 'chat-moderation']);

const { sanitizeTiaText, MAX_TIA_TEXT_CHARS } = tiaText;
const { sanitizeChatText } = security;
const { isInappropriateChatMessage } = moderation;

console.log('\n── La formattazione sopravvive');
{
  const twoParagraphs = 'Certo, la faccio subito.\n\nPer il logo servono ancora due informazioni: il nome esatto e se avete già dei colori.';
  const cleaned = sanitizeTiaText(twoParagraphs);
  check('due paragrafi restano due paragrafi', cleaned === twoParagraphs, JSON.stringify(cleaned.slice(0, 60)));

  const list = 'Fatto:\n- logo consegnato\n- sito in revisione\n\nResta da fare:\n- test finali';
  check('gli elenchi su più righe restano intatti', sanitizeTiaText(list) === list);

  check('una riga semplice non viene toccata', sanitizeTiaText('Perfetto, a domani!') === 'Perfetto, a domani!');
  check('i tab a inizio riga sopravvivono (indentazione)', sanitizeTiaText('Titolo:\n\tprimo punto') === 'Titolo:\n\tprimo punto');
  check('gli spazi a fine riga vengono tolti', sanitizeTiaText('riga uno  \nriga due  ') === 'riga uno\nriga due');
  check('3+ a-capo diventano UN paragrafo (non 80)', sanitizeTiaText('a\n\n\n\n\n\nb') === 'a\n\nb');
  check('a-capo singolo resta a-capo (riga successiva, non paragrafo)', sanitizeTiaText('prima\nseconda') === 'prima\nseconda');
}

console.log('\n── La sicurezza non regredisce');
{
  check('tag HTML rimossi', sanitizeTiaText('ciao <script>alert(1)</script> mondo') === 'ciao alert(1) mondo', JSON.stringify(sanitizeTiaText('ciao <script>alert(1)</script> mondo')));
  check('javascript: rimosso', !/javascript/i.test(sanitizeTiaText('guarda javascript:alert(1)')));
  check('data:text/html rimosso', !/data:\s*text\/html/i.test(sanitizeTiaText('x data:text/html,<h1>y</h1>')));
  check('caratteri di controllo rimossi (tranne \\n e \\t)', !/[\u0000-\u0008\u000B\u000C]/.test(sanitizeTiaText('a\u0000b\u0007c\nd')));
  check('override bidi rimossi (attacco RTL invisibile)', !/[\u202A-\u202E\u2066-\u2069]/.test(sanitizeTiaText(' benigno \u202E gnpls \u202C')));
  check('zero-width rimossi (parole nascoste alla moderazione)', !/[\u200B-\u200D\u2060]/.test(sanitizeTiaText('ca\u200Bzzo')));
  check('NUL + tag insieme: nessuna strada verso il widget', !/[<>\u0000]/.test(sanitizeTiaText('<img src=x onerror=alert(1)>\u0000')));

  const bomb = 'x'.repeat(9_000);
  check('limite di 8.000 caratteri complessivi', sanitizeTiaText(bomb).length === MAX_LINE_CHARS, `→ ${sanitizeTiaText(bomb).length} (una sola riga: vale prima il limite di riga)`);
  const fiveLines = Array.from({ length: 9 }, (_, i) => `riga ${i} ${'y'.repeat(1_500)}`).join('\n');
  check('più righe normali → il complessivo 8.000 fa da tetto', sanitizeTiaText(fiveLines).length === 8_000, `→ ${sanitizeTiaText(fiveLines).length}`);
  check('limite di 2.000 caratteri per riga (niente scroll orizzontale)', sanitizeTiaText(`ciao\n${bomb}`).split('\n')[1].length === MAX_LINE_CHARS);
  check('non-stringa → stringa vuota, mai crash', sanitizeTiaText(undefined) === '' && sanitizeTiaText(42) === '' && sanitizeTiaText(null) === '');

  // Trailing newlines after the length cut: stripping them once more, so the
  // bubble never ends on a stray gap.
  check('nessun a-capo finale dopo il trim', !/\n$/.test(sanitizeTiaText(`testo\n\n${'x'.repeat(8_000)}`)));
}

console.log('\n── La moderazione vede ancora tutto (gli a-capo non nascondono le parole)');
{
  // isInappropriateChatMessage collapses whitespace itself, so a banned word
  // hidden across a line break is still caught — the formatting must not be a
  // moderation blind spot.
  const hidden = 'che bello questo\ncazzo di problema';
  check('parola vietata divisa da un a-capo → comunque bloccata', isInappropriateChatMessage(sanitizeTiaText(hidden)) === true);
  check('messaggio pulito su più paragrafi → non bloccato', isInappropriateChatMessage(sanitizeTiaText('Buongiorno!\n\nLe ho preparato il preventivo:\n- sito vetrina\n- consegna 2 settimane')) === false);
}

console.log('\n── Le due vie di trasporto si comportano allo stesso modo');
{
  // The webhook applies sanitizeTiaText to BOTH the /reply command payload and
  // the direct-message body. Verify in source, so a future edit cannot make
  // one path keep paragraphs and the other flatten them.
  const { readFileSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const webhook = readFileSync(resolve(ROOT, 'src/app/api/chat/webhook/route.ts'), 'utf8');
  const occurrences = webhook.split('sanitizeTiaText(').length - 1;
  check('la webhook usa sanitizeTiaText due volte (risposta e diretto)', occurrences === 2, `occorrenze: ${occurrences}`);
  check('nessuna delle due vie usa ancora la sanitizer dei visitatori', !webhook.includes('sanitizeChatText('), webhook.includes('sanitizeChatText(') ? 'sanitizeChatText ancora presente' : 'pulito');
  check('l\u2019import di sanitizeTiaText c\u2019è', /import \{ sanitizeTiaText \} from '@\/lib\/tia-text'/.test(webhook));

  // Visitor input keeps the strict sanitizer.
  const chatRoute = readFileSync(resolve(ROOT, 'src/app/api/chat/route.ts'), 'utf8');
  check('i messaggi dei VISITATORI continuano a usare sanitizeChatText (collasso), com\u2019era', /sanitizeChatText\(body\.text\)/.test(chatRoute));

  // The widget displays with whitespace-pre-line: without it, kept newlines
  // would render as spaces and the fix would be invisible.
  const shell = readFileSync(resolve(ROOT, 'src/app/components/HomeShell.tsx'), 'utf8');
  check('le bolle della chat renderizzano gli a-capo (whitespace-pre-line)', /whitespace-pre-line/.test(shell));
}

console.log('\n── Differenza dai visitatori (il comportamento vecchio, voluto)');
{
  const multi = 'Paragrafo uno.\n\nParagrafo due.';
  check('un VISITATORE scrivendo la stessa cosa → collassata (com\u2019era prima)', sanitizeChatText(multi) === 'Paragrafo uno. Paragrafo due.', JSON.stringify(sanitizeChatText(multi)));
  check('TIA scrivendo la stessa cosa → paragrafi intatti', sanitizeTiaText(multi) === multi);
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Tutti i controlli del testo Tia superati.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);
