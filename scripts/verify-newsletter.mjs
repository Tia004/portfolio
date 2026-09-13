// Verifies the newsletter layer — the part of the double opt-in that a click in
// the browser cannot prove:
//
//   • a signup creates a PENDING record and never a confirmed one;
//   • an address that opted out is the ONLY thing that blocks a campaign, and it
//     blocks every target except a hand-typed list;
//   • an opted-out address that signs up again goes through the confirmation
//     email once more (fresh consent, never inherited);
//   • a campaign to subscribers carries a real one-click opt-out, and a message
//     to a contact who never subscribed does not pretend to;
//   • nothing about the response reveals whether an address is already on the list.
//
// Run: node scripts/verify-newsletter.mjs
import { loadTsModules, ROOT } from './load-ts-module.mjs';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const { newsletter, 'email-template': template } = loadTsModules(['seo', 'newsletter', 'email-markdown', 'email-template']);
const {
  decideSignup,
  normalizeEmail,
  newToken,
  hashIp,
  newsletterUrl,
  resolveAudience,
  consentTextFor,
  unsubscribeFooterCopy,
  confirmationEmailContent,
  welcomeEmailContent,
  CONFIRM_RESEND_WINDOW_MS,
} = newsletter;
const { buildBrandedEmailHtml } = template;

console.log('\n── Double opt-in: what a signup decides');
{
  check('nuovo indirizzo → crea record pending', decideSignup(null).action === 'create');

  check(
    'già confermato → nessuna email, nessuna azione',
    decideSignup({ status: 'confirmed' }).action === 'already_confirmed',
  );

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  check(
    'pending da poco → throttled (niente seconda email)',
    decideSignup({ status: 'pending', lastEmailAt: twoMinutesAgo }).action === 'throttled',
  );

  const justOutside = new Date(Date.now() - CONFIRM_RESEND_WINDOW_MS - 1000);
  check(
    'pending ma link mai usato → re-invia il link',
    decideSignup({ status: 'pending', lastEmailAt: justOutside }).action === 'resend',
  );

  check(
    'pending senza lastEmailAt (invio fallito) → re-invia subito',
    decideSignup({ status: 'pending', lastEmailAt: null }).action === 'resend',
  );

  check(
    'disiscritto che si re-iscrive → nuovo consenso (create, non resend)',
    decideSignup({ status: 'unsubscribed' }).action === 'create',
  );
}

console.log('\n── Indirizzi e token');
{
  check('normalizza maiuscole e spazi', normalizeEmail('  Tia@Example.COM ') === 'tia@example.com');
  check('rifiuta i non-stringa', normalizeEmail(undefined) === '' && normalizeEmail(42) === '');
  check('tronca gli indirizzi assurdi', normalizeEmail(`${'a'.repeat(400)}@x.it`).length === 254);

  const tokens = new Set(Array.from({ length: 200 }, () => newToken()));
  check('200 token, 200 valori distinti', tokens.size === 200);
  check('token URL-safe (nessun +, / o =)', [...tokens].every((t) => /^[A-Za-z0-9_-]+$/.test(t)));
  check('token abbastanza lunghi (≥ 40 caratteri)', [...tokens].every((t) => t.length >= 40));

  const ip = '203.0.113.7';
  const hashed = hashIp(ip, 'salt-di-test');
  check('l\u2019IP non è mai conservato in chiaro', !hashed.includes(ip) && hashed.length === 32);
  check('lo stesso IP con lo stesso salt dà lo stesso hash', hashIp(ip, 'salt-di-test') === hashed);
  check('salt diverso → hash diverso (non è una tabella riusabile)', hashIp(ip, 'altro-salt') !== hashed);
  check('IP vuoto → hash vuoto', hashIp('') === '');
}

console.log('\n── Link nelle email');
{
  check('IT senza prefisso di lingua', newsletterUrl('it', 'confirm', 'tok') === 'https://tiadesigns.it/newsletter/conferma?token=tok');
  check('EN sotto /en', newsletterUrl('en', 'unsubscribe', 'tok') === 'https://tiadesigns.it/en/newsletter/disiscrizione?token=tok');
  check('ES sotto /es', newsletterUrl('es', 'confirm', 'tok').startsWith('https://tiadesigns.it/es/newsletter/conferma'));
  check('token url-encoded', newsletterUrl('it', 'confirm', 'a b+c').endsWith('token=a%20b%2Bc'));
  check('pagina disiscrizione senza token (form manuale)', newsletterUrl('it', 'unsubscribe') === 'https://tiadesigns.it/newsletter/disiscrizione');
}

console.log('\n── Audience: chi riceve una campagna');
{
  const subscribers = [
    { email: 'iscritto@ok.it', status: 'confirmed' },
    { email: 'attesa@ok.it', status: 'pending' },
    { email: 'uscito@ok.it', status: 'unsubscribed' },
  ];
  const contacts = ['cliente@ok.it', 'uscito@ok.it'];
  const leads = ['lead@ok.it'];

  const subs = resolveAudience({ target: 'subscribers', subscribers, contactEmails: contacts, leadEmails: leads });
  check(
    'target "subscribers" = solo i confermati',
    subs.emails.length === 1 && subs.emails[0] === 'iscritto@ok.it',
    subs.emails.join(', '),
  );

  const all = resolveAudience({ target: 'all_audience', subscribers, contactEmails: contacts, leadEmails: leads });
  check(
    'un disiscritto è escluso ANCHE se è anche un contatto/lead',
    !all.emails.includes('uscito@ok.it'),
    all.emails.join(', '),
  );
  check('la soppressione viene contata', all.suppressed === 1, `suppressed=${all.suppressed}`);
  check(
    'i non confermati non entrano da nessun target',
    !all.emails.includes('attesa@ok.it'),
  );
  check(
    'contatti e lead entrano senza duplicati',
    all.emails.length === 3 && new Set(all.emails).size === 3,
    all.emails.join(', '),
  );

  const custom = resolveAudience({
    target: 'custom',
    subscribers,
    contactEmails: [],
    leadEmails: [],
    customEmails: 'uscito@ok.it, scritto-a-mano@ok.it',
  });
  check(
    'una lista scritta a mano supera la soppressione ma la segnala',
    custom.emails.length === 2 && custom.suppressed === 1,
    custom.emails.join(', '),
  );

  const junk = resolveAudience({
    target: 'custom',
    subscribers: [],
    contactEmails: [],
    leadEmails: [],
    customEmails: 'non-una-email, ok@ok.it, doppia@ok.it\nDOPPIA@ok.it',
  });
  check(
    'le stringhe non-email vengono scartate e i duplicati fusi',
    junk.emails.length === 2 && junk.emails.includes('ok@ok.it'),
    junk.emails.join(', '),
  );

  const empty = resolveAudience({ target: 'subscribers', subscribers: [], contactEmails: [], leadEmails: [] });
  check('nessun iscritto → nessun destinatario (non "tutti")', empty.emails.length === 0 && empty.suppressed === 0);
}

console.log('\n── Copy: il consenso e la disiscrizione in 3 lingue');
{
  for (const lang of ['it', 'en', 'es']) {
    const consent = consentTextFor(lang);
    const footer = unsubscribeFooterCopy(lang);
    check(`consenso ${lang} presente e completo`, consent.length > 60 && footer.note.length > 5 && footer.link.length > 5);
  }
  check(
    'le tre versioni del consenso sono davvero diverse',
    new Set(['it', 'en', 'es'].map((l) => consentTextFor(l))).size === 3,
  );
  check(
    'lingua sconosciuta → fallback italiano, mai undefined',
    consentTextFor('de') === consentTextFor('it') && unsubscribeFooterCopy('de').link === unsubscribeFooterCopy('it').link,
  );

  const confirmIt = confirmationEmailContent('it', 'https://x/confirm', 'Marco');
  check('email di conferma: CTA = link di conferma', confirmIt.ctaUrl === 'https://x/confirm');
  check('email di conferma: saluta per nome', confirmIt.bodyMarkdown.includes('Marco'));
  const welcome = welcomeEmailContent('en', 'https://tiadesigns.it');
  check('email di benvenuto EN: link alla home inglese', welcome.ctaUrl === 'https://tiadesigns.it/en/#progetti');
}

console.log('\n── Footer della email: opt-out vero, non "rispondi a questa email"');
{
  const withOptOut = buildBrandedEmailHtml({
    title: 'Novità',
    bodyMarkdown: 'Ciao, ecco le novità.',
    unsubscribeUrl: 'https://tiadesigns.it/newsletter/disiscrizione?token=abc',
    unsubscribeNote: unsubscribeFooterCopy('it').note,
    unsubscribeLinkText: unsubscribeFooterCopy('it').link,
  });
  check('la campagna contiene il link di disiscrizione', withOptOut.includes('newsletter/disiscrizione?token=abc'));
  check('la campagna NON invita a rispondere alla email', !withOptOut.includes('rispondi direttamente a questa email'));
  check('Etichetta IT presente', withOptOut.includes('Disiscriviti con un clic'));

  const en = buildBrandedEmailHtml({
    title: 'News',
    bodyMarkdown: 'Hello.',
    unsubscribeUrl: 'https://tiadesigns.it/en/newsletter/disiscrizione?token=abc',
    unsubscribeNote: unsubscribeFooterCopy('en').note,
    unsubscribeLinkText: unsubscribeFooterCopy('en').link,
  });
  check('Etichetta EN presente (il footer segue la lingua dell\u2019iscritto)', en.includes('Unsubscribe with one click'));

  const noOptOut = buildBrandedEmailHtml({ title: 'Risposta', bodyMarkdown: 'Ciao.' });
  check(
    'un messaggio a un contatto che non si è iscritto tiene il footer normale',
    noOptOut.includes('rispondi direttamente a questa email') && !noOptOut.includes('Disiscriviti con un clic'),
  );

  const escaped = buildBrandedEmailHtml({
    title: 'X',
    bodyMarkdown: 'Y',
    unsubscribeUrl: 'https://tiadesigns.it/u?token=a"onmouseover="alert(1)',
    unsubscribeNote: 'nota',
    unsubscribeLinkText: 'link',
  });
  check(
    'l\u2019URL di opt-out è escapato nell\u2019HTML (niente injection)',
    !escaped.includes('"onmouseover="alert(1)') && escaped.includes('&quot;onmouseover=&quot;'),
  );
}

console.log('\n── Dashboard: il target "iscritti" e il pannello devono restare cablati');
{
  // Nothing here is subtle — but a target that exists in the API and not in the
  // dropdown is a feature nobody can reach, and a panel that lost its data hook
  // shows zeroes forever. Both are one-line deletions away.
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const dashboard = readFileSync(resolve(ROOT, 'src/app/loginmaster/dashboard/page.tsx'), 'utf8');
  const api = readFileSync(resolve(ROOT, 'src/app/api/master/newsletter/route.ts'), 'utf8');
  const cron = readFileSync(resolve(ROOT, 'src/app/api/cron/newsletter/route.ts'), 'utf8');

  check('la dashboard offre il target "subscribers"', /value="subscribers"/.test(dashboard));
  check('la dashboard ha il pannello Iscritti', /Iscritti Newsletter/.test(dashboard));
  check('la dashboard legge gli iscritti dalla API', /setNewsletterSubscribers\(data\.subscribers/.test(dashboard));
  check('la API espone i contatori per stato', /subscribersConfirmed/.test(api) && /subscribersUnsubscribed/.test(api));
  check('la API e il cron usano lo STESSO loader di audience', /loadCampaignAudience/.test(api) && /loadCampaignAudience/.test(cron));
  check(
    'la API e il cron allegano il link di opt-out per destinatario',
    /unsubscribeUrl: optOut\.url/.test(api) && /unsubscribeUrl: optOut\.url/.test(cron),
  );
  check('la conferma invia anche il link di opt-out nel benvenuto', /newsletterUrl\(confirmedLang, 'unsubscribe'/.test(readFileSync(resolve(ROOT, 'src/app/api/newsletter/confirm/route.ts'), 'utf8')));
  check(
    'nessuna email di campagna esce senza il footer di opt-out quando il destinatario è iscritto',
    /unsubscribeFooterCopy/.test(api) && /unsubscribeFooterCopy/.test(cron),
  );
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Tutti i controlli newsletter superati.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);
