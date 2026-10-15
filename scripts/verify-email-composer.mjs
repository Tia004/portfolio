// Exercise the real dashboard with API responses isolated from live mail/data.
// Start a dedicated server with SESSION_SECRET=email-composer-isolated-local-test-secret.
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const token = await new SignJWT({ userId: 'local-composer-test', username: 'master' })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('5m')
    .sign(new TextEncoder().encode('email-composer-isolated-local-test-secret'));
  await browser.setCookie({ name: 'master_session', value: token, domain: 'localhost', path: '/', httpOnly: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  let sentBody = '';
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/master/aruba-mail/send') sentBody = request.postData() || '';
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(['/api/projects', '/api/master/messages', '/api/master/quotes', '/api/master/faqs', '/api/master/reviews'].includes(url.pathname) ? [] : {
        success: true, authenticated: true, projects: [], messages: [], quotes: [], templates: [],
        emails: [], mailboxes: [], subscribers: [], passkeys: [], assets: [], alerts: [],
        leads: [], opportunities: [], activities: [], contacts: [], data: [], notifications: [],
      }) });
    } else if (url.origin !== 'http://localhost:3011') void request.abort();
    else void request.continue();
  });
  await page.goto('http://localhost:3011/loginmaster/dashboard', { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0[class*="99999"]'));
  const clickText = async (text) => {
    await page.waitForFunction((text) => [...document.querySelectorAll('button')].some((el) => el.textContent.includes(text)), {}, text);
    await page.evaluate((text) => [...document.querySelectorAll('button')].find((el) => el.textContent.includes(text)).click(), text);
  };
  await clickText('Webmail & Inbox');
  await clickText('Componi Stile Gmail');
  await page.waitForSelector('[aria-label="Titolo nella mail (Title)"]');
  const click = async (selector) => {
    await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click(selector);
  };
  const waitValue = (label, expected) => page.waitForFunction((label, expected) => document.querySelector(`[aria-label="${label}"]`)?.value === expected, {}, label, expected);
  const setValue = async (selector, value) => {
    await page.$eval(selector, (el, value) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  };
  await waitValue('Titolo nella mail (Title)', 'Proposta per il tuo Progetto');
  assert.ok(await page.$eval('#compose-message', (el) => el.value.length > 40));
  await setValue('[aria-label="Titolo nella mail (Title)"]', 'Website for Studio FOW');
  await page.waitForFunction(() => document.querySelector('iframe')?.srcdoc.includes('Website for Studio FOW'));
  await click('[aria-label="Ripristina Titolo nella mail (Title)"]');
  await waitValue('Titolo nella mail (Title)', 'Proposta per il tuo Progetto');
  await clickText('Follow-up / Ricontatto');
  await waitValue('Titolo nella mail (Title)', 'Hai avuto modo di valutare la proposta?');
  await setValue('[aria-label="Titolo nella mail (Title)"]', 'Changed');
  await click('[aria-label="Ripristina Titolo nella mail (Title)"]');
  await waitValue('Titolo nella mail (Title)', 'Hai avuto modo di valutare la proposta?');
  await click('summary');
  await setValue('[aria-label="Nome nella firma"]', 'FOW test signature');
  await setValue('[aria-label="Testo del footer"]', 'English footer');
  await setValue('[aria-label="Saluto (facoltativo)"]', 'Hi Studio FOW,');
  await page.waitForFunction(() => document.querySelector('iframe')?.srcdoc.includes('FOW test signature'));
  const iframe = await (await page.$('iframe')).contentFrame();
  await iframe.waitForFunction(() => document.querySelector('img')?.naturalWidth > 0);
  assert.ok((await iframe.content()).includes('English footer'));
  await setValue('input[placeholder="destinatario@cliente.com"]', 'test@example.com');
  await click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('Email inviata con successo direttamente'));
  assert.ok(sentBody.includes('cid:TiaDesignsLogo-white.png'), 'sent email must embed the logo');
  assert.ok(sentBody.includes('FOW test signature') && sentBody.includes('English footer') && sentBody.includes('Hi Studio FOW,'));
  await click('[aria-label="Ripristina Nome nella firma"]');
  await waitValue('Nome nella firma', 'Mattia Chinaglia');
  await clickText('Ripristina preset');
  await waitValue('Titolo nella mail (Title)', 'Proposta per il tuo Progetto');
  assert.equal(await page.$eval('input[placeholder="destinatario@cliente.com"]', (el) => el.value), '');
  mkdirSync('screenshots/email-composer', { recursive: true });
  await page.screenshot({ path: 'screenshots/email-composer/desktop.png', fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: 'screenshots/email-composer/mobile.png', fullPage: true });
  assert.deepEqual(errors, [], 'no browser errors');
  console.log('PASS: initial preset, editing, live preview, field reset, selected preset defaults, signature/footer/greeting, logo loading, captured send payload, full reset; no email sent.');
} finally { await browser.close(); }
