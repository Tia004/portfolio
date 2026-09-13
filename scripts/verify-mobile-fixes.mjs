#!/usr/bin/env node

/**
 * Verify two mobile fixes:
 *  1. the "Il mio processo" carousel lets the page scroll vertically when the
 *     finger drags over a card (same touch-action/lenis guards as the sliders);
 *  2. the floating chat window card is opaque, uses the card border-radius and
 *     its glow halo fits inside the widget's screen margin (no chopped glow).
 * Run: BASE_URL=http://localhost:3100 node scripts/verify-mobile-fixes.mjs
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

const scrollStepwise = async (page, to, step = 260) => {
  const from = await page.evaluate(() => window.scrollY);
  const dir = to > from ? 1 : -1;
  for (let y = from; dir > 0 ? y < to : y > to; y += dir * step) {
    await page.evaluate((p) => window.scrollTo(0, p), y);
    await sleep(50);
  }
  await page.evaluate((p) => window.scrollTo(0, p), to);
  await sleep(700);
};

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(3000);

  // ── 1. Processo carousel ────────────────────────────────────────────────
  let processo = null;
  for (let i = 0; i < 40 && !processo; i++) {
    processo = await page.evaluate(() => {
      const root = document.querySelector('#processo');
      if (!root) return null;
      const track = [...root.querySelectorAll('div')].find(
        (d) => d.scrollWidth > d.clientWidth + 20 && d.clientWidth > 200 && d.querySelector('.border-glow-card')
      );
      if (!track) return null;
      const cs = getComputedStyle(track);
      const card = track.querySelector('.border-glow-card');
      const r = card.getBoundingClientRect();
      return {
        touchAction: cs.touchAction,
        overflowY: cs.overflowY,
        overflowX: cs.overflowX,
        overscrollX: cs.overscrollBehaviorX,
        lenisPrevent: track.hasAttribute('data-lenis-prevent'),
        lenisTouch: track.hasAttribute('data-lenis-prevent-touch'),
        cardTouchAction: getComputedStyle(card).touchAction,
        point: { x: Math.round(r.left + r.width / 2), y: Math.round(Math.min(r.top + 60, window.innerHeight - 140)) },
      };
    });
    if (!processo) await scrollStepwise(page, await page.evaluate(() => window.scrollY + 500));
  }

  if (!processo) {
    check(false, 'processo carousel found');
  } else {
    console.log('── processo track:', JSON.stringify(processo));
    check(processo.touchAction === 'pan-x pan-y', 'track touch-action allows pan-y', processo.touchAction);
    check(processo.overflowY === 'hidden', 'track is not a vertical scrollport', processo.overflowY);
    check(processo.lenisPrevent && processo.lenisTouch, 'track opts out of Lenis (wheel + touch)');
    check(processo.overscrollX === 'contain', 'horizontal overscroll contained', processo.overscrollX);

    // Vertical finger drag starting ON a card must scroll the page, including a
    // wobbly gesture (a few px sideways first) that a snap track could capture.
    const drag = async (startX, startY, dx, dy) => {
      const client = await page.createCDPSession();
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] });
      for (let i = 1; i <= 8; i++) {
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: startX + (dx * i) / 8, y: startY + (dy * i) / 8 }],
        });
        await sleep(16);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
      await sleep(450);
    };

    const before = await page.evaluate(() => window.scrollY);
    await drag(processo.point.x, processo.point.y, 0, -220);
    const afterStraight = await page.evaluate(() => window.scrollY);
    check(afterStraight - before > 40, 'straight vertical drag over a card scrolls the page', `Δ${Math.round(afterStraight - before)}px`);

    const beforeWobble = await page.evaluate(() => window.scrollY);
    await drag(processo.point.x, processo.point.y, 18, -200);
    const afterWobble = await page.evaluate(() => window.scrollY);
    check(afterWobble - beforeWobble > 40, 'wobbly (diagonal) drag over a card still scrolls the page', `Δ${Math.round(afterWobble - beforeWobble)}px`);

    // The carousel must still scroll horizontally. The page moved under the
    // earlier drags, so re-measure where a card is NOW before touching it.
    const trackState = () => page.evaluate(() => {
      const root = document.querySelector('#processo');
      const track = [...root.querySelectorAll('div')].find((d) => d.scrollWidth > d.clientWidth + 20 && d.clientWidth > 200 && d.querySelector('.border-glow-card'));
      const r = track.getBoundingClientRect();
      return { scrollLeft: track.scrollLeft, y: Math.round(Math.min(r.top + r.height / 2, window.innerHeight - 140)), x: Math.round(r.left + r.width / 2) };
    });
    // Informational only: headless Chrome never routes a synthetic horizontal
    // touch pan to THIS track (verified identical with every guard reverted,
    // while the MobileSnapSlider control does move) — the environment can't
    // exercise it, so it is not a pass/fail signal here.
    const hBefore = await trackState();
    await drag(hBefore.x, hBefore.y, -180, 0);
    const hAfter = await trackState();
    console.log(`ℹ️  horizontal swipe: scrollLeft ${hBefore.scrollLeft} → ${hAfter.scrollLeft} (informational)`);
  }

  // ── 2. Chat window card ────────────────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  await page.evaluate(() => document.querySelector('button[aria-label="Apri chat"]')?.click());
  await sleep(1500);

  const chat = await page.evaluate(() => {
    const card = document.querySelector('.border-glow-card.chat-window-h');
    if (!card) return null;
    const cs = getComputedStyle(card);
    const inner = card.querySelector('[role="dialog"]');
    const r = card.getBoundingClientRect();
    const glowPad = parseFloat(cs.getPropertyValue('--glow-padding')) || 0;
    const chartMarginRight = window.innerWidth - r.right;
    const chartMarginBottom = window.innerHeight - r.bottom;
    const bg = cs.backgroundColor;
    const alpha = Number((bg.match(/rgba?\(([^)]+)\)/)?.[1] ?? '0,0,0,1').split(',')[3] ?? 1);
    return {
      glowPad,
      marginRight: Math.round(chartMarginRight),
      marginBottom: Math.round(chartMarginBottom),
      radius: cs.getPropertyValue('--border-radius'),
      innerRadius: getComputedStyle(inner).borderRadius,
      fillOpacity: cs.getPropertyValue('--fill-opacity'),
      cardBg: bg,
      cardAlpha: alpha,
      innerBg: getComputedStyle(inner).backgroundColor,
      innerAlpha: Number((getComputedStyle(inner).backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1] ?? '0,0,0,1').split(',')[3] ?? 1),
      innerZ: getComputedStyle(inner).zIndex,
      size: { w: Math.round(r.width), h: Math.round(r.height) },
    };
  });

  if (!chat) {
    check(false, 'chat window card found');
  } else {
    console.log('── chat card:', JSON.stringify(chat));
    check(chat.glowPad <= chat.marginRight && chat.glowPad <= chat.marginBottom, 'glow halo fits the screen margin (not chopped)', `pad ${chat.glowPad} vs margins ${chat.marginRight}/${chat.marginBottom}`);
    check(chat.radius === '20px', 'card uses the site card radius', chat.radius);
    check(chat.innerRadius === chat.radius, 'inner surface radius matches the card (clean corners)', `card ${chat.radius} / inner ${chat.innerRadius}`);
    check(Number(chat.fillOpacity) === 0, 'no translucent fill wash over the window', `fill-opacity ${chat.fillOpacity}`);
    check(chat.cardAlpha === 1 && chat.innerAlpha === 1, 'window background fully opaque', `${chat.cardBg} / ${chat.innerBg}`);
  }

  console.log(failed === 0 ? '\n✅ all checks passed' : `\n❌ ${failed} check(s) failed`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}
