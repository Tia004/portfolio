// Exercise the real dashboard with API responses isolated from live mail/data.
// Start a dedicated server with SESSION_SECRET=email-composer-isolated-local-test-secret.
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const BASE = process.env.EMAIL_TEST_BASE_URL || 'http://localhost:3011';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error('Only an isolated localhost fixture is allowed');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const token = await new SignJWT({ userId: 'local-composer-test', username: 'master' })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('5m')
    .sign(new TextEncoder().encode('email-composer-isolated-local-test-secret'));
  await browser.setCookie({ name: 'master_session', value: token, domain: 'localhost', path: '/', httpOnly: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  let sentBody = ''; const dispatches=[]; let held; let hold=false;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/master/emails/auto-send') {
        dispatches.push(JSON.parse(request.postData()));
        if (hold) {held=request;return;}
        void request.respond({status:502,contentType:'application/json',body:JSON.stringify({success:false,uncertain:true,error:'Synthetic unknown result'})});return;
      }
      if (url.pathname === '/api/master/aruba-mail/send') sentBody = request.postData() || '';
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(['/api/projects', '/api/master/messages', '/api/master/quotes', '/api/master/faqs', '/api/master/reviews'].includes(url.pathname) ? [] : {
        success: true, authenticated: true, projects: [], messages: [], quotes: [], templates: [],
        emails: [], mailboxes: [], subscribers: [], passkeys: [], assets: [], alerts: [],
        leads: [], opportunities: [], activities: [], contacts: [], data: [], notifications: [],
      }) });
    } else if (url.origin !== BASE) void request.abort();
    else void request.continue();
  });
  await page.goto(`${BASE}/loginmaster/dashboard`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0[class*="99999"]'));
  const clickText = async (text) => {
    await page.waitForFunction((text) => [...document.querySelectorAll('button')].some((el) => el.textContent.includes(text)), {}, text);
    await page.evaluate((text) => [...document.querySelectorAll('button')].find((el) => el.textContent.includes(text)).click(), text);
  };
  await clickText('Webmail & Inbox');
  await clickText('Inviatore Automatico CSV');
  await clickText('Inserimento Manuale');
  page.on('dialog', dialog => dialog.accept());
  const setManual = async count => {
    await page.$eval('textarea', (el, value) => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,value);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    }, Array.from({length:count},(_,i)=>`fixture${i}@example.test`).join('\n'));
    await clickText('Carica Destinatari nel Modello');
  };
  await setManual(500);
  await clickText('Avvia');
  await page.waitForFunction(()=>document.body.innerText.includes('non avvia campagne oltre 150'));
  assert.equal(dispatches.length,0,'500-recipient campaign must not be sent through Aruba');
  await clickText('Svuota');
  await page.waitForFunction(()=>document.body.innerText.includes('Nessun destinatario presente'));
  await setManual(2);
  await clickText('Avvia');
  await page.waitForFunction(()=>document.body.innerText.includes('Da verificare — nessun reinvio automatico'));
  assert.equal(dispatches.length,1,'unknown first send must halt the second');
  assert.ok(dispatches[0].requestId && dispatches[0].to==='fixture0@example.test');
  assert.ok(!(await page.evaluate(()=>document.body.innerText)).includes('Riprova solo le fallite'));
  hold=true;
  await clickText('Avvia');
  const deadline=Date.now()+5000;
  while(!held && Date.now()<deadline) await new Promise(r=>setTimeout(r,20));
  assert.ok(held);
  await clickText('Interrompi');
  assert.ok(!await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Avvia Invio'))),'cancel must not enable a new run while a request is unresolved');
  await held.respond({status:502,contentType:'application/json',body:JSON.stringify({success:false,uncertain:true,error:'Synthetic unknown after cancel'})});
  await page.waitForFunction(()=>document.body.innerText.includes('2 da verificare'));
  assert.equal(dispatches.length,2);assert.notEqual(dispatches[0].to,dispatches[1].to);
  assert.deepEqual(errors,[]);
  console.log('PASS: 500 contacts blocked before API, uncertain send stops batch, no automatic retry, request identity present, cancel keeps in-flight barrier; zero real emails.');
} finally { await browser.close(); }
