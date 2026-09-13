// Verifies the weekly Telegram digest.
//
// What matters here is not that a message is produced — it is that it stays
// TRUE when the week is bad, empty or only just started, and that it says the
// one thing the owner cannot get anywhere else: which referral codes actually
// produced leads, and which ones circulated without producing any.
//
// Run: node scripts/verify-weekly-digest.mjs
import { loadTsModules } from './load-ts-module.mjs';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const { 'conversion-metrics': metrics, 'weekly-digest': digest } =
  loadTsModules(['conversion-metrics', 'conversion-labels', 'weekly-digest']);

const { emptyCounts } = metrics;
const { buildWeeklyDigest, windowRange } = digest;

const NOW = new Date('2026-09-14T09:00:00').getTime();

const counts = (preventivo, call, chat) => ({
  preventivo_inviato: preventivo,
  call_prenotata: call,
  chat_primo_messaggio: chat,
  total: preventivo + call + chat,
});

const baseInput = (over = {}) => ({
  days: 7,
  now: NOW,
  totals: counts(0, 0, 0),
  previousTotals: counts(0, 0, 0),
  sessions: 0,
  previousSessions: 0,
  sources: [],
  referrals: [],
  ...over,
});

console.log('\n── La finestra è dichiarata');
{
  check('la finestra copre 7 giorni', windowRange(NOW, 7) === '7 set–14 set', windowRange(NOW, 7));
  const week = buildWeeklyDigest(baseInput());
  check('la data è nel messaggio', week.text.includes('settimana 7 set–14 set'));
}

console.log('\n── Settimana con lead, sorgenti e passaparola');
{
  const result = buildWeeklyDigest(baseInput({
    totals: counts(7, 3, 2),
    previousTotals: counts(5, 2, 2),
    sessions: 146,
    previousSessions: 120,
    sources: [
      { source: 'contact_form', total: 5, ...counts(3, 2, 0) },
      { source: 'cal_embed', total: 3, ...counts(0, 3, 0) },
      { source: 'ai_quote', total: 2, ...counts(2, 0, 0) },
      { source: 'chatbot', total: 2, ...counts(2, 0, 0) },
    ],
    referrals: [
      { code: 'MARCO20', sessions: 12, pageviews: 31, conversions: counts(2, 1, 0), lastSeen: NOW },
      { code: 'LUCA', sessions: 4, pageviews: 9, conversions: emptyCounts(), lastSeen: NOW },
    ],
  }));

  const t = result.text;
  check('totale conversioni con confronto delle sessioni', t.includes('12 conversioni su 146 sessioni (+26)'), t.split('\n')[2]);
  check(
    'il tasso è confrontato con quello della settimana prima, numeri inclusi',
    t.includes('8,2% di conversione (settimana prima: 7,5% — 9 conversioni su 120 sessioni)'),
    t.split('\n')[3],
  );
  check('i tre passi del funnel sono elencati', t.includes('Preventivi inviati: 7 (+2)') && t.includes('Call prenotate: 3 (+1)') && t.includes('Chat avviate: 2 (=)'));
  check('le sorgenti sono tradotte e in ordine', t.includes('1. Form contatti — 5') && t.includes('2. Calendario Cal.com — 3'), t.split('Da dove sono arrivati:')[1]?.split('\n').slice(1, 4).join(' | '));
  check('i codici con lead sono separati da quelli senza', result.leadCodes.length === 1 && result.coldCodes.length === 1);
  check('il codice con lead mostra lead e sessioni', t.includes('✅ MARCO20 — 3 lead da 12 sessioni (25%)'));
  check('il codice senza lead è segnalato come tale', t.includes('⚠️ LUCA — 4 sessioni, ancora nessun lead'));
  check('il messaggio è entro il limite di Telegram (4096)', t.length < 4096, `${t.length} caratteri`);
  check('il riepilogo è di una riga e leggibile', result.headline.includes('12 conversioni') && result.headline.includes('1 codice con lead'), result.headline);
}

console.log('\n── Settimana senza conversioni (il caso in cui è facile mentire)');
{
  const result = buildWeeklyDigest(baseInput({ sessions: 88, previousSessions: 90, referrals: [] }));
  const t = result.text;
  check('lo zero è detto in chiaro', t.includes('0 conversioni su 88 sessioni'));
  check('non inventa percentuali', !t.includes('NaN') && !t.includes('Infinity') && t.includes('0% di conversione'));
  check('dice che nessun codice è stato usato', t.includes('nessun codice usato questa settimana'));
  check('spiega il contesto, non solo il numero', t.includes('Nessun lead questa settimana:'), t.split('\n').slice(-3).join(' | '));
  check('nessuna sezione vuota con titolo e niente sotto', !/\nDa dove sono arrivati:\n\n/.test(t));
}

console.log('\n── Prima settimana in assoluto');
{
  const result = buildWeeklyDigest(baseInput({
    totals: counts(1, 0, 0),
    previousTotals: counts(0, 0, 0),
    sessions: 30,
    previousSessions: 0,
    referrals: [{ code: 'ANNA', sessions: 3, pageviews: 6, conversions: emptyCounts(), lastSeen: NOW }],
  }));
  const t = result.text;
  check('senza baseline non inventa un confronto percentuale', !t.includes('-100%') && t.includes('prima settimana'), t.split('\n')[2]);
  check('e non ripete il confronto sul tasso', !t.includes('settimana prima:'), t.split('\n')[3]);
  check('un solo codice, senza lead, è riportato', t.includes('nessun codice ha ancora portato un lead') && t.includes('⚠️ ANNA'));
}

console.log('\n── Confronto: più traffico ma meno lead (i due numeri restano distinti)');
{
  const result = buildWeeklyDigest(baseInput({
    totals: counts(1, 0, 0),
    previousTotals: counts(4, 2, 0),
    sessions: 200,
    previousSessions: 90,
  }));
  const t = result.text;
  check('le sessioni crescono e si vede', t.includes('(+110)'), t.split('\n')[2]);
  // 1 conversione contro 6: il calo si legge accanto a un traffico che invece
  // cresce, che è esattamente la distinzione che il messaggio deve rendere ovvia.
  check('le conversioni calano e si vede', t.includes('1 conversione su 200 sessioni (+110)'), t.split('\n')[2]);
  check(
    'il tasso precedente mostra il calo',
    t.includes('0,5% di conversione (settimana prima: 6,7% — 6 conversioni su 90 sessioni)'),
    t.split('\n')[3],
  );
}

console.log('\n── Liste lunghe: si taglia, non si tronca il messaggio');
{
  const manySources = Array.from({ length: 9 }, (_, i) => ({ source: `sorgente_${i}`, total: 9 - i, ...counts(9 - i, 0, 0) }));
  const manyCodes = Array.from({ length: 9 }, (_, i) => ({ code: `CODE${i}`, sessions: 9 - i, pageviews: 9, conversions: i === 0 ? counts(1, 0, 0) : emptyCounts(), lastSeen: NOW }));
  const result = buildWeeklyDigest(baseInput({
    totals: counts(1, 0, 0),
    sessions: 50,
    sources: manySources,
    referrals: manyCodes,
  }));
  check('le sorgenti in eccesso sono riassunte', result.text.includes('…e altre 4 sorgenti'));
  // 9 codici: 1 con lead, 8 senza → 5 elencati, 3 riassunti.
  check('i codici in eccesso sono riassunti', result.text.includes('…e altri 3 codici senza lead'));
  check('senza traduzione le sorgenti ignote restano leggibili', result.text.includes('sorgente_0'));
  check('il messaggio resta sotto il limite anche con liste lunghe', result.text.length < 4096, `${result.text.length} caratteri`);
}

console.log('\n── Input sporco');
{
  const result = buildWeeklyDigest(baseInput({ totals: counts(0, 1, 0), sessions: 1 }));
  check('una sola sessione, una conversione: nessun crash', result.text.includes('100% di conversione'), result.text.split('\n')[3]);
  const zero = buildWeeklyDigest(baseInput());
  check('zero sessioni → 0% (mai NaN)', zero.text.includes('0% di conversione') && !zero.text.includes('NaN'));
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Tutti i controlli del riepilogo settimanale superati.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);
