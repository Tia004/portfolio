// ── Text from the owner's own channel ─────────────────────────────────────
// The two directions of the direct chat are not the same input, and treating
// them identically is what flattened Tia's replies:
//
//   • a VISITOR message comes from the open internet and gets the full
//     paranoid treatment (sanitizeChatText in chat-security): every control
//     character stripped, every whitespace run collapsed to one space — a
//     formatting channel carries no information worth trusting;
//   • a TIA reply comes from the configured Telegram chat, the one channel the
//     owner writes in, guarded by the webhook secret AND the chat-id check
//     before this code runs. The formatting there IS the message: a paragraph
//     break is "I am answering your two points separately", not noise.
//
// So Tia's text keeps its line structure while shedding everything that could
// be dangerous when the browser renders it. The invariant, in one sentence:
// what arrives at the widget is safe regardless of how it is displayed, and
// the display can then treat newlines as formatting (whitespace-pre-line).
//
// This module is used by the Telegram webhook for BOTH transport paths
// (/reply command and direct message): the two paths must not differ, or the
// formatting would survive one route and vanish through the other.

/** Control characters that can hijack rendering or hide payloads: everything
 *  below 0x20 EXCEPT \n (0x0A) and \t (0x09), plus DEL and the bidi
 *  overrides. RTL overrides are invisible, cross whole platforms and are a
 *  classic way to make a benign-looking string render as an attack. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Zero-width characters that glue payloads together or hide words from
 *  moderation: stripped entirely. */
const INVISIBLES = /[\u200B-\u200D\u2060]/g;

export const MAX_TIA_TEXT_CHARS = 8_000;

/** Cap for a SINGLE line: a horizontal-scroll bomb is one 8k-character line. */
const MAX_LINE_CHARS = 2_000;

/**
 * Sanitizes text written by the owner (Tia) while keeping paragraph structure.
 *
 * Kept: \n newlines, \t tabs, everything printable.
 * Dropped: control and bidi-override characters, zero-width invisibles, HTML
 * tags, javascript:/data:text/html schemes, trailing whitespace per line.
 * Collapsed: 3+ consecutive blank lines become one blank line (a paragraph
 * break), because Telegram itself caps at 2 and an 80-newline paste is not
 * formatting, it is a rendering nuisance.
 * Capped: 8,000 characters overall (same ceiling as visitor messages) and
 * 2,000 per line — the line cap first, so ONE pasted line can never crowd out
 * every real paragraph from the budget.
 */
export function sanitizeTiaText(value: unknown, maxChars: number = MAX_TIA_TEXT_CHARS): string {
  if (typeof value !== 'string') return '';

  const safe = value
    .normalize('NFKC')
    .replace(CONTROL_CHARS, '')
    .replace(INVISIBLES, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, '').slice(0, MAX_LINE_CHARS))
    .join('\n')
    // A blank line separates paragraphs; three or more newlines in a row is a
    // paste, not a paragraph. Exactly TWO newlines = one blank line = one
    // paragraph break, which is what whitespace-pre-line renders as a gap.
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // The OVERALL cap applies to the joined text, then trailing newlines are
  // stripped once more so a length cut never ends the bubble on a stray blank
  // line. (The per-line cap runs earlier: one long line costs its 2,000 and
  // nothing more — a 9,000-character paste on one line is truncated at 2,000,
  // not at 8,000 of undifferentiated wall.)
  return safe.slice(0, maxChars).replace(/\n+$/g, '');
}
