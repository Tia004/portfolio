/**
 * The one and only branded-email layout.
 *
 * Lives in its own module — with no server-only imports — so the dashboard can
 * import exactly what the server sends. Before this split the composer built
 * its email with a hand-written HTML string while the API routes used
 * `branded-email.ts`: two templates, two different emails, and a preview pane
 * labelled "Anteprima Reale per il Destinatario" that was neither real nor
 * preview. Import cost of keeping them apart: every format fix had to be made
 * twice, and it never was.
 *
 * Notes on the markup, because email is not the web:
 *   • tables, not flex/grid; inline styles only, no <style> block;
 *   • the logo is white-on-transparent: the brand mark is pure black (measured
 *     luminance 0.078), so the source PNG is invisible on this dark background,
 *     hence `TiaDesignsLogo-white.png` — an inverted copy, generated once;
 *   • a background image animating behind the text is not something email
 *     clients do (Gmail strips it, Outlook ignores it). A GIF banner in the
 *     header is the supported answer, and this template takes an optional
 *     `bannerUrl` for exactly that.
 */
import { escapeEmailHtml, renderEmailMarkdown } from './email-markdown';

const BRAND_URL = 'https://tiadesigns.it';
const BRAND_NAME = 'Tia Designs';
/** White (inverted) brand mark — remote URL for web preview or external fallback. */
export const REMOTE_LOGO_URL = `${BRAND_URL}/TiaDesignsLogo-white.png`;
const LOGO_URL = REMOTE_LOGO_URL;
/** Inline CID reference for automatic display in email clients without remote image prompts. */
export const CID_LOGO_URL = 'cid:TiaDesignsLogo-white.png';
/** Intrinsic size of the file; the display size is half of it (2× for retina). */
const LOGO_WIDTH = 90;
const LOGO_HEIGHT = 48;

export interface BrandedEmailOptions {
  recipientName?: string;
  title?: string;
  bodyMarkdown: string;
  ctaText?: string;
  ctaUrl?: string;
  badgeText?: string;
  /** Hidden first line clients show next to the subject in the inbox list. */
  preheaderText?: string;
  /** Optional animated GIF banner shown under the top bar (see module note). */
  bannerUrl?: string;
  /** Alt text for the banner; defaults to the brand name. */
  bannerAlt?: string;
  /** Specific logo URL or CID override. */
  logoUrl?: string;
  /** Set to true when rendering in browser DOM to avoid unresolvable cid: scheme. */
  forPreview?: boolean;
}

/** A badge that just repeats the logo adds nothing — only render informative ones. */
function badgeHtml(badgeText?: string): string {
  const badge = badgeText?.trim();
  if (!badge || badge.toLowerCase() === BRAND_NAME.toLowerCase()) return '';
  return `
                        <td align="right" valign="middle">
                          <span style="display:inline-block; background-color:rgba(45,212,191,0.12); border:1px solid rgba(45,212,191,0.4); color:#5eead4; border-radius:999px; padding:5px 13px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">
                            ${escapeEmailHtml(badge)}
                          </span>
                        </td>`;
}

function preheaderHtml(text?: string): string {
  if (!text?.trim()) return '';
  // Hidden preview line: rendered but not shown in the body, so the inbox list
  // shows a sentence instead of the first words of the greeting.
  return `
      <div style="display:none; font-size:1px; color:#040d0a; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
        ${escapeEmailHtml(text.trim())}
      </div>`;
}

function bannerHtml(url?: string, alt?: string): string {
  if (!url) return '';
  return `
              <tr>
                <td style="padding:0; font-size:0; line-height:0;">
                  <img src="${escapeEmailHtml(url)}" alt="${escapeEmailHtml(alt || BRAND_NAME)}" width="620" style="display:block; width:100%; max-width:620px; height:auto; border:0; outline:none;" />
                </td>
              </tr>`;
}

export function buildBrandedEmailHtml({
  recipientName,
  title,
  bodyMarkdown,
  ctaText,
  ctaUrl,
  badgeText = BRAND_NAME,
  preheaderText,
  bannerUrl,
  bannerAlt,
  logoUrl,
  forPreview,
}: BrandedEmailOptions): string {
  const safeName = recipientName ? escapeEmailHtml(recipientName) : '';
  const safeTitle = title ? escapeEmailHtml(title) : '';
  const safeCtaText = ctaText ? escapeEmailHtml(ctaText) : '';
  const safeCtaUrl = ctaUrl ? escapeEmailHtml(ctaUrl) : '';

  // Prevent duplicate greeting (e.g. "Ciao Marco," above the card AND "Ciao Marco," inside the card).
  // If safeName is provided, strip any redundant greeting line from the start of bodyMarkdown.
  let cleanBodyMarkdown = bodyMarkdown;
  if (safeName) {
    const leadingGreetingRegex = /^\s*(?:ciao|salve|buongiorno|buonasera|gentile|egregio|hey|hi|hello|dear)\b[^\n]*?(?:[,!:]|\s)\s*(?:\r?\n)+/i;
    cleanBodyMarkdown = cleanBodyMarkdown.replace(leadingGreetingRegex, '');
  }

  const contentHtml = renderEmailMarkdown(cleanBodyMarkdown);

  const isBrowser = typeof window !== 'undefined';
  const effectiveLogoSrc = logoUrl || (isBrowser || forPreview ? REMOTE_LOGO_URL : CID_LOGO_URL);

  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="dark light" />
      <title>${safeTitle || BRAND_NAME}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#040d0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#f3f4f6;">
      ${preheaderHtml(preheaderText)}
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#040d0a; padding:30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px; background-color:#071713; border:1px solid rgba(45,212,191,0.35); border-radius:20px; overflow:hidden;">

              <!-- Top glow bar -->
              <tr>
                <td height="4" style="height:4px; line-height:4px; font-size:0; background-color:#2dd4bf; background-image:linear-gradient(90deg,#14b8a6,#2dd4bf,#5eead4,#14b8a6);">&nbsp;</td>
              </tr>
${bannerHtml(bannerUrl, bannerAlt)}
              <!-- Header: the logo, and nothing else -->
              <tr>
                <td style="padding:26px 32px 22px 32px; border-bottom:1px solid rgba(255,255,255,0.07); background-color:#040d0a;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td valign="middle">
                        <img src="${effectiveLogoSrc}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="${BRAND_NAME}" style="display:block; width:${LOGO_WIDTH}px; height:${LOGO_HEIGHT}px; border:0; outline:none; text-decoration:none;" />
                      </td>${badgeHtml(badgeText)}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 32px 26px 32px;">
                  ${safeTitle ? `<h1 style="color:#ffffff; font-size:23px; font-weight:700; margin:0 0 18px 0; line-height:1.3;">${safeTitle}</h1>` : ''}
                  ${safeName ? `<p style="color:#5eead4; font-size:15px; font-weight:600; margin:0 0 18px 0;">Ciao ${safeName},</p>` : ''}

                  <div style="background-color:#040d0a; border:1px solid rgba(255,255,255,0.06); border-left:3px solid #2dd4bf; border-radius:12px; padding:22px 26px;">
                    ${contentHtml}
                  </div>

                  ${
                    safeCtaText && safeCtaUrl
                      ? `
                  <div style="margin:30px 0 6px 0; text-align:center;">
                    <a href="${safeCtaUrl}" target="_blank" data-button="1" style="display:inline-block; background-color:#2dd4bf; color:#03211b; font-size:14px; font-weight:700; line-height:1; text-decoration:none; padding:16px 36px; border-radius:999px;">
                      ${safeCtaText} &rarr;
                    </a>
                  </div>`
                      : ''
                  }
                </td>
              </tr>

              <!-- Signature -->
              <tr>
                <td style="padding:0 32px 28px 32px;">
                  <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
                    <p style="margin:0; color:#ffffff; font-size:14px; font-weight:700;">Mattia Chinaglia</p>
                    <p style="margin:3px 0 0 0; color:#2dd4bf; font-size:12px;">Founder & Lead Creative Developer • ${BRAND_NAME}</p>
                    <p style="margin:8px 0 0 0; color:#9ca3af; font-size:12px; line-height:1.7;">
                      Email: <a href="mailto:info@tiadesigns.it" style="color:#2dd4bf; text-decoration:underline; font-weight:600;">info@tiadesigns.it</a><br />
                      Web: <a href="${BRAND_URL}" style="color:#2dd4bf; text-decoration:underline; font-weight:600;">tiadesigns.it</a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#030b09; padding:18px 32px; border-top:1px solid rgba(255,255,255,0.07); text-align:center;">
                  <p style="margin:0; color:#6b7280; font-size:11px; line-height:1.6;">
                    Proposta inviata da Mattia Chinaglia • ${BRAND_NAME} • Mantova, Italia<br />
                    Se non desideri ricevere ulteriori proposte o hai domande, rispondi direttamente a questa email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export { LOGO_URL, BRAND_URL, BRAND_NAME };
