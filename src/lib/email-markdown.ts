/**
 * Markdown → HTML for the emails we send.
 *
 * The dashboard composer offers formatting buttons (`##`, `-`, `1.`, `>`, `**`)
 * and then used to drop the raw text into a `white-space: pre-wrap` div: every
 * marker showed up literally in the delivered email. This module is the missing
 * half — the same renderer runs in the browser (live preview) and on the server
 * (what actually leaves the building), so the two can never disagree again.
 *
 * Email clients are a hostile rendering target: no stylesheet freedom, no
 * flex/grid, no JS, and Outlook renders through Word. Everything here therefore
 * emits inline styles on table-safe elements only.
 *
 * Deliberately a small subset, not CommonMark:
 *   # / ## / ###            headings (h1 / h2 / h3)
 *   - * +                   bullet list
 *   1. / 1)                 ordered list
 *   >                       quote
 *   ---                     divider
 *   **bold**  *italic*  ~~strike~~  `code`
 *   [text](url)             link — always teal, always underlined
 *   [Bottone: text](url)    rounded CTA button with its own vertical space
 *   https://… / a@b.it      auto-linked
 *
 * Nested lists are flattened to a single level, and raw HTML already in the
 * message (the image / GIF / link inserts) is passed through — but sanitised,
 * with every <a> forced to the brand teal: a link nobody can see is a link
 * nobody clicks.
 */

// ── Inline styles ──────────────────────────────────────────────────────────
// Kept as constants so the preview, the composer and every transactional email
// (quote, newsletter, cron) cannot drift apart.

const S = {
  para: 'margin:0 0 14px 0; font-size:15px; line-height:1.7; color:#e5e7eb;',
  h1: 'color:#ffffff; font-size:22px; font-weight:700; line-height:1.3; margin:0 0 16px 0;',
  h2: 'color:#ffffff; font-size:18px; font-weight:700; line-height:1.35; margin:24px 0 10px 0;',
  h3: 'color:#5eead4; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin:22px 0 8px 0;',
  list: 'margin:12px 0; padding-left:22px; color:#e5e7eb; font-size:15px; line-height:1.7;',
  item: 'margin-bottom:7px;',
  quote: 'margin:14px 0; padding:12px 16px; border-left:3px solid #2dd4bf; background-color:#081713; border-radius:0 10px 10px 0; color:#cbd5e1; font-size:15px; line-height:1.7;',
  divider: 'height:1px; line-height:1px; font-size:0; background-color:rgba(255,255,255,0.09); margin:22px 0; border:0;',
  code: 'background-color:rgba(45,212,191,0.12); border-radius:6px; padding:1px 6px; font-family:Consolas,Menlo,monospace; font-size:13px; color:#5eead4;',
  link: 'color:#2dd4bf; text-decoration:underline; font-weight:600;',
  button:
    'display:inline-block; background-color:#2dd4bf; color:#03211b; font-size:14px; font-weight:700; line-height:1; text-decoration:none; padding:15px 34px; border-radius:999px;',
  buttonWrap: 'margin:26px 0; text-align:center;',
  strong: 'color:#ffffff; font-weight:700;',
  em: 'color:#a7f3d0; font-style:italic;',
  strike: 'text-decoration:line-through; color:#94a3b8;',
} as const;

// ── Escaping ──────────────────────────────────────────────────────────────

/** Escape text destined for HTML output (also used for attribute values). */
export function escapeEmailHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/** A bare address, written without a scheme: `info@tiadesigns.it`. */
const BARE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Only these schemes may end up in an href. Kills `javascript:` and friends. */
function safeUrl(raw: string): string {
  const url = raw.trim();
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^www\./i.test(url)) return `https://${url}`;
  // An address typed without a scheme still has to become a working link —
  // previously this returned '' and the address stayed plain, unclickable text.
  if (BARE_EMAIL.test(url)) return `mailto:${url}`;
  return '';
}

// ── Raw-HTML hygiene ──────────────────────────────────────────────────────

/** Strip anything executable from HTML the composer inserted. */
function sanitizeRawHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|base)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Force every anchor to the brand teal, keeping any other declaration it had.
 * A link pasted from elsewhere arrives with its own colour (often blue, often
 * invisible on a dark background) — this makes the rule unconditional.
 */
export function tealifyAnchors(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    let kept = '';
    const stripped = attrs.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i, (_m, _q, dq: string, sq: string) => {
      kept = (dq ?? sq ?? '')
        .split(';')
        .map((d) => d.trim())
        .filter((d) => d && !/^(color|text-decoration)\s*:/i.test(d))
        .join('; ');
      return '';
    });
    const style = [kept, 'color:#2dd4bf', 'text-decoration:underline', 'font-weight:600']
      .filter(Boolean)
      .join('; ');
    return `<a${stripped} style="${style}">`;
  });
}

// ── Inline rendering ──────────────────────────────────────────────────────

/** Inline HTML the composer legitimately inserts, protected from escaping. */
const INLINE_HTML =
  /<a\b[^>]*>[\s\S]*?<\/a>|<(?:u|s|b|i|strong|em|span|small|code)\b[^>]*\/?>|<\/(?:u|s|b|i|strong|em|span|small|code)>/gi;

/** The CTA token: `[Bottone: Prenota una call](https://…)`. */
export const BUTTON_RE = /\[Bottone:\s*([^\]]+?)\s*\]\(\s*([^)\s]+)\s*\)/gi;

export function buttonHtml(label: string, url: string, block: boolean): string {
  const href = safeUrl(url);
  const text = escapeEmailHtml(label);
  if (!href) return `<strong style="${S.strong}">${text}</strong>`;
  // `data-button` is inert in every mail client and exists so the rendering
  // checks can tell a button (dark on teal) from a text link (teal on dark).
  const anchor = `<a href="${escapeEmailHtml(href)}" target="_blank" data-button="1" style="${S.button}">${text} &rarr;</a>`;
  // Outlook's Word engine ignores border-radius, so it degrades to a solid
  // square button — still legible, still clickable, never broken.
  return block ? `<div style="${S.buttonWrap}">${anchor}</div>` : anchor;
}

function linkHtml(labelHtml: string, rawUrl: string): string {
  const href = safeUrl(rawUrl);
  if (!href) return labelHtml;
  return `<a href="${escapeEmailHtml(href)}" target="_blank" style="${S.link}">${labelHtml}</a>`;
}

/** Auto-link bare URLs and email addresses. Runs on already-escaped text. */
function autolink(text: string): string {
  const re = /(^|[\s(])((?:https?:\/\/|www\.)[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  return text.replace(re, (match, lead: string, raw: string) => {
    // Trailing sentence punctuation is not part of the URL.
    const trailing = /[.,;:!?)\]]+$/.exec(raw)?.[0] ?? '';
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!url) return match;
    const href = safeUrl(url);
    if (!href) return match;
    return `${lead}<a href="${escapeEmailHtml(href)}" target="_blank" style="${S.link}">${url}</a>${trailing}`;
  });
}

/** Render one line of inline Markdown. */
export function renderEmailInline(text: string): string {
  // 1. Protect inline HTML the composer inserted, so escaping cannot mangle it.
  const tokens: string[] = [];
  const mask = (html: string) => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };

  let out = text
    .replace(INLINE_HTML, (m) => mask(m))
    // Buttons first: their label is user text that still needs escaping, so
    // build the final anchor now and mask it like any other raw HTML.
    .replace(BUTTON_RE, (_m, label: string, url: string) => mask(buttonHtml(label, url, false)));

  // 2. Escape everything that is left — this text lands in an email body.
  out = escapeEmailHtml(out);

  // 3. Inline Markdown. Longest markers first so `**` wins over `*`.
  out = out
    .replace(/`([^`]+)`/g, (_m, code: string) => `<code style="${S.code}">${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_m, bold: string) => `<strong style="${S.strong}">${bold}</strong>`)
    .replace(/~~([^~]+)~~/g, (_m, struck: string) => `<span style="${S.strike}">${struck}</span>`)
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, (_m, lead: string, em: string) => `${lead}<em style="${S.em}">${em}</em>`);

  // 4. Auto-links and explicit links.
  out = autolink(out);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => linkHtml(label, url));

  // 5. Put the protected HTML back, normalising its links to teal.
  return out.replace(/\u0000(\d+)\u0000/g, (_m, idx: string) => tealifyAnchors(tokens[Number(idx)]));
}

/** Depth of unclosed non-void tags — used to find the end of a raw HTML block. */
function openDepth(html: string): number {
  const VOID = /^(br|img|hr|input|meta|link|source|area|col)$/i;
  let depth = 0;
  for (const m of html.matchAll(/<\s*(\/?)\s*([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, closing, tag, selfClosing] = m;
    if (VOID.test(tag)) continue;
    if (closing === '/') depth -= 1;
    else if (selfClosing !== '/') depth += 1;
  }
  return depth;
}

/**
 * Render a whole message. Blank-line separated, line-driven: a formatting
 * button can leave `## Titolo` in the middle of a paragraph and it still works.
 */
export function renderEmailMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flush = () => {
    if (!paragraph.length) return;
    out.push(`<p style="${S.para}">${paragraph.map(renderEmailInline).join('<br />')}</p>`);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    // Divider
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush();
      out.push(`<div style="${S.divider}"></div>`);
      i++;
      continue;
    }

    // Heading
    const heading = /^\s*(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      const style = level === 1 ? S.h1 : level === 2 ? S.h2 : S.h3;
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      out.push(`<${tag} style="${style}">${renderEmailInline(heading[2].trim())}</${tag}>`);
      i++;
      continue;
    }

    // Quote
    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote style="${S.quote}">${buf.map(renderEmailInline).join('<br />')}</blockquote>`);
      continue;
    }

    // Lists
    const ordered = /^\s*\d+[.)]\s+/.test(line);
    const bullet = /^\s*[-*+]\s+/.test(line);
    if (ordered || bullet) {
      flush();
      const itemRe = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]);
        if (m) {
          items.push(renderEmailInline(m[1].trim()));
          i++;
          continue;
        }
        // Indented continuation line belongs to the previous item.
        if (items.length && /^\s+\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)]|>|#{1,3})\s/.test(lines[i])) {
          items[items.length - 1] += ` ${renderEmailInline(lines[i].trim())}`;
          i++;
          continue;
        }
        break;
      }
      const tag = ordered ? 'ol' : 'ul';
      const body = items.map((it) => `<li style="${S.item}">${it}</li>`).join('');
      out.push(`<${tag} style="${S.list}">${body}</${tag}>`);
      continue;
    }

    // A button alone on its line becomes a real, spaced, centred CTA.
    const button = /^\s*\[Bottone:\s*([^\]]+?)\s*\]\(\s*([^)\s]+)\s*\)\s*$/i.exec(line);
    if (button) {
      flush();
      out.push(buttonHtml(button[1], button[2], true));
      i++;
      continue;
    }

    // Raw HTML block (image / GIF / pasted markup): consume until balanced.
    if (/^\s*</.test(line)) {
      flush();
      const buf: string[] = [];
      let depth = 0;
      while (i < lines.length) {
        const current = lines[i];
        if (buf.length > 0 && !current.trim()) break;
        if (buf.length > 0 && depth <= 0) break;
        if (buf.length > 0 && !/^\s*</.test(current)) break;
        buf.push(current);
        depth += openDepth(current);
        i++;
        if (depth <= 0) break;
      }
      out.push(sanitizeRawHtml(tealifyAnchors(buf.join('\n'))));
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flush();
  return out.join('\n');
}
