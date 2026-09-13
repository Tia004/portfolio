// Verifies the floating direct-chat widget in a real browser:
//   · the window sits ABOVE the launcher bubble (12px gap), never off-screen
//   · the gooey blob neck is rendered between them
//   · the window is OPAQUE (not translucent glass)
//   · [CAL] / [AI] markers become real buttons, never raw text
//   · [CAL] scrolls to Contatti and opens the Cal.com window
//   · [AI] hands the transcript to the site AI on the chatbot section
//
// POSTs to /api/chat and /api/chat/ai are ABORTED on purpose: the optimistic
// bubble is what we assert on, and a test must never ping the real Telegram
// or spend AI tokens.
//
// Run: BASE_URL=http://localhost:3100 node scripts/verify-chat-widget.mjs
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = nodePath.resolve('screenshots/chat-widget');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

/** Abort the two POSTs that reach the real world (Telegram / AI provider). */
async function guardNetwork(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    const method = req.method();
    const blocked = method === 'POST' && (/\/api\/chat(\?|$)/.test(url) || /\/api\/chat\/ai(\?|$)/.test(url) || /\/api\/analytics\/log/.test(url));
    if (blocked) req.abort().catch(() => {});
    else req.continue().catch(() => {});
  });
}

async function sendChatText(page, text) {
  const box = await page.$('.chat-window-h textarea');
  if (!box) throw new Error('chat textarea not found');
  await box.click();
  await box.type(text, { delay: 8 });
  await page.keyboard.press('Enter');
  await sleep(450);
}

for (const view of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await guardNetwork(page);
  await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120_000 });
  await sleep(3500);

  console.log(`\n── Chat widget (${view.name})`);
  const opened = await page.evaluate(() => {
    const btn = document.querySelector('[data-chat-launcher]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  check('Launcher opens the chat', opened);
  await sleep(800);

  const geom = await page.evaluate(() => {
    const card = document.querySelector('.chat-window-h');
    const btn = document.querySelector('[data-chat-launcher]');
    if (!card || !btn) return null;
    const c = card.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const bg = getComputedStyle(card).backgroundColor;
    return {
      gapAboveBubble: Math.round(b.top - c.bottom),
      cardTop: Math.round(c.top),
      cardBottom: Math.round(c.bottom),
      bubbleTop: Math.round(b.top),
      bubbleBottom: Math.round(b.bottom),
      cardRight: Math.round(c.right),
      viewportH: window.innerHeight,
      viewportW: window.innerWidth,
      bubbleVisible: b.height > 40 && getComputedStyle(btn).opacity === '1',
      bg,
      opaque: !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*(0?\.\d+|0)\s*\)/.test(bg),
      blob: Boolean(document.querySelector('svg#chat-blob-goo, filter#chat-blob-goo')) || document.body.innerHTML.includes('chat-blob-goo'),
      roundedOk: getComputedStyle(card).borderTopLeftRadius,
      onlineDot: Boolean(btn.querySelector('span')),
    };
  });
  check('Window renders with the launcher bubble', Boolean(geom));
  if (geom) {
    check('Window starts ABOVE the bubble', geom.bubbleTop >= geom.cardBottom - 1, `gap ${geom.gapAboveBubble}px`);
    check('Exactly the 12px blob gap', Math.abs(geom.gapAboveBubble - 12) <= 1, `${geom.gapAboveBubble}px`);
    check('Window never overflows the top edge', geom.cardTop >= 0, `top ${geom.cardTop}px`);
    check('Window stays inside the viewport width', geom.cardRight <= geom.viewportW + 1, `right ${geom.cardRight} / ${geom.viewportW}`);
    check('Bubble stays on screen (not pushed off)', geom.bubbleBottom <= geom.viewportH, `bottom ${geom.bubbleBottom} / ${geom.viewportH}`);
    check('Bubble is visible while the chat is open', geom.bubbleVisible && geom.onlineDot);
    check('Window background is fully opaque', geom.opaque, geom.bg);
    check('Window keeps the site card radius (20px)', geom.roundedOk === '20px', geom.roundedOk);
    check('Liquid blob layer is rendered', geom.blob);
  }
  await page.screenshot({ path: nodePath.join(OUT, `chat-open-${view.name}.png`) });

  // ── The blob, verified in PIXELS ──
  // A DOM assertion can only say "an <svg> exists". This renders the widget
  // region twice — with and without the goo layer — and checks that what
  // changed is a real neck bridging the gap between the window and the
  // bubble, in every row of that gap.
  if (view.name === 'desktop') {
    const region = await page.evaluate(() => {
      const card = document.querySelector('.chat-window-h').getBoundingClientRect();
      const bubble = document.querySelector('[data-chat-launcher]').getBoundingClientRect();
      return {
        x: Math.round(card.left - 24), y: Math.round(card.bottom - 6),
        width: Math.round(card.width + 48), height: Math.round(bubble.top - card.bottom + 12),
        gapTop: Math.round(card.bottom), bubbleTop: Math.round(bubble.top),
      };
    });
    const clip = { x: region.x, y: region.y, width: region.width, height: region.height };
    const withBlob = await page.screenshot({ clip, encoding: 'binary' });
    // Hide, never REMOVE: the <svg> is React-managed, and deleting it by hand
    // corrupts the tree on the next render (page dies with a null listener).
    await page.evaluate(() => {
      const svg = document.querySelector('#chat-blob-goo')?.closest('svg');
      if (svg instanceof SVGElement) svg.style.visibility = 'hidden';
    });
    await sleep(150);
    const withoutBlob = await page.screenshot({ clip, encoding: 'binary' });
    await page.evaluate(() => {
      const svg = document.querySelector('#chat-blob-goo')?.closest('svg');
      if (svg instanceof SVGElement) svg.style.visibility = '';
    });
    const { data: a, info } = await sharp(withBlob).raw().toBuffer({ resolveWithObject: true });
    const { data: b } = await sharp(withoutBlob).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const rows = new Array(info.height).fill(0);
    let changed = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * channels;
        const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        if (d > 24) { changed++; rows[y]++; }
      }
    }
    // Rows are relative to the clip: the gap band sits below card.bottom.
    const gapStart = region.gapTop - region.y;
    const gapEnd = region.bubbleTop - region.y;
    const gapRows = rows.slice(gapStart + 1, gapEnd);
    const rowsWithNeck = gapRows.filter((n) => n >= 4).length;
    check('The blob is actually painted (pixel diff)', changed > 300, `${changed} px changed`);
    check('The blob bridges the whole gap to the bubble', gapRows.length > 0 && rowsWithNeck >= gapRows.length - 1, `${rowsWithNeck}/${gapRows.length} rows`);
    fs.writeFileSync(nodePath.join(OUT, `blob-${view.name}.png`), withBlob);
  }

  const sendBtn = await page.evaluate(() => {
    const btn = document.querySelector('.chat-window-h button[aria-label="Invia messaggio"]');
    if (!btn) return null;
    const svg = btn.querySelector('svg');
    return { radius: getComputedStyle(btn).borderRadius, paths: svg.querySelectorAll('path').length, stroke: svg.getAttribute('stroke') };
  });
  // Tailwind v4 compiles rounded-full to calc(infinity * 1px), so the computed
  // radius reads as a huge number rather than "50%".
  const radiusPx = sendBtn ? Number.parseFloat(sendBtn.radius) : 0;
  check('Send button is round and carries the new icon', sendBtn !== null && (sendBtn.radius === '50%' || radiusPx >= 1e6) && sendBtn.paths >= 1, sendBtn ? `radius ${sendBtn.radius}, ${sendBtn.paths} path(s)` : 'not found');

  // The consent card is up on a first visit; the chat input must still be the
  // element a tap lands on (it used to be covered by the banner, and the tap
  // then CLOSED the chat because the banner is outside the widget).
  const inputReachable = await page.evaluate(() => {
    const ta = document.querySelector('.chat-window-h textarea');
    if (!ta) return null;
    const r = ta.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    const banner = document.querySelector('[data-cookie-banner]');
    const b = banner?.getBoundingClientRect();
    const c = document.querySelector('.chat-window-h').getBoundingClientRect();
    return {
      topmost: top?.tagName || '',
      bannerVisible: Boolean(banner),
      bannerOverlapsWindow: Boolean(b && b.right > c.left && b.top < c.bottom),
      bubbleVisible: Boolean(document.querySelector('[data-chat-launcher]')) && document.querySelector('[data-chat-launcher]').getBoundingClientRect().height > 40,
    };
  });
  check('Chat input is actually tappable (nothing covering it)', inputReachable?.topmost === 'TEXTAREA', `topmost ${inputReachable?.topmost}`);
  check('Consent banner no longer overlaps the window', !inputReachable?.bannerOverlapsWindow, inputReachable?.bannerVisible ? 'banner shown' : 'no banner');

  // ── [CAL] / [AI] markers ────────────────────────────────────────────────
  await sendChatText(page, 'Perfetto, procediamo [CAL]');
  const cal = await page.evaluate(() => {
    const btn = document.querySelector('[data-chat-action="CAL"]');
    const bubble = btn?.closest('.chat-window-h');
    return {
      exists: Boolean(btn),
      label: btn?.textContent?.trim() || '',
      rawMarkerShown: (bubble?.innerText || '').includes('[CAL]'),
      width: btn ? Math.round(btn.getBoundingClientRect().width) : 0,
    };
  });
  check('[CAL] marker becomes a button', cal.exists, cal.label);
  check('[CAL] raw marker is not shown to the visitor', !cal.rawMarkerShown);
  check('[CAL] button carries the localized label', cal.label.length > 0 && !cal.label.includes('['), cal.label);

  if (cal.exists) {
    await page.evaluate(() => document.querySelector('[data-chat-action="CAL"]')?.click());
    await sleep(3200);
    const afterCal = await page.evaluate(() => {
      const dialog = document.querySelector('div[class*="10004"]');
      return {
        bookingWindow: Boolean(dialog),
        freezesPage: document.body.style.position === 'fixed',
        chatStillOpen: Boolean(document.querySelector('.chat-window-h')),
      };
    });
    check('[CAL] opens the Cal.com booking window', afterCal.bookingWindow);
    check('[CAL] closes the chat widget first', !afterCal.chatStillOpen);
    check('[CAL] freezes the page behind the window', afterCal.freezesPage);
    await page.screenshot({ path: nodePath.join(OUT, `chat-cal-${view.name}.png`) });

    // Closing Cal must PARk the visitor on the contacts section: the booking
    // window froze the page at the old offset, so restoring it blindly (the
    // old bug) dropped them back where they started from.
    await page.keyboard.press('Escape');
    await sleep(2600);
    const afterClose = await page.evaluate(() => {
      const section = document.getElementById('contatti');
      return {
        sectionTop: section ? Math.round(section.getBoundingClientRect().top) : null,
        scrollY: Math.round(window.scrollY),
      };
    });
    check('[CAL] lands on the contacts section after closing Cal', afterClose.sectionTop !== null && Math.abs(afterClose.sectionTop - 180) < 220, `section top ${afterClose.sectionTop}px (scrollY ${afterClose.scrollY})`);
  }

  // ── [AI] handoff (fresh load: the page is scroll-frozen by the Cal modal) ──
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120_000 });
  await sleep(3000);
  await page.evaluate(() => document.querySelector('[data-chat-launcher]')?.click());
  await sleep(700);
  await sendChatText(page, 'Preferisco parlarne con la AI [AI]');
  const ai = await page.evaluate(() => {
    const btn = document.querySelector('[data-chat-action="AI"]');
    return { exists: Boolean(btn), label: btn?.textContent?.trim() || '' };
  });
  check('[AI] marker becomes a button', ai.exists, ai.label);
  if (ai.exists) {
    await page.evaluate(() => document.querySelector('[data-chat-action="AI"]')?.click());
    await sleep(3200);
    const afterAi = await page.evaluate(() => {
      const section = document.getElementById('chatbot');
      const bubbleText = document.querySelector('.chat-window-h')?.innerText || '';
      return {
        chatbotTop: section ? Math.round(section.getBoundingClientRect().top) : null,
        handoffShown: document.body.innerText.includes('Preferisco continuare'),
        chatStillOpen: Boolean(document.querySelector('.chat-window-h')),
        botBubbles: document.querySelectorAll('#chatbot [class*="rounded-2xl"]').length,
        _bubbleText: bubbleText.length,
      };
    });
    check('[AI] scrolls to the chatbot section', afterAi.chatbotTop !== null && Math.abs(afterAi.chatbotTop - 180) < 200, `top ${afterAi.chatbotTop}px`);
    check('[AI] closes the chat widget first', !afterAi.chatStillOpen);
    check('[AI] the handoff shows up in the AI conversation', afterAi.handoffShown);
    await page.screenshot({ path: nodePath.join(OUT, `chat-ai-${view.name}.png`) });
  }

  check('No runtime errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
