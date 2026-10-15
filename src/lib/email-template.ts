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

export const EMAIL_DESIGN_DEFAULTS = {
  greeting: '',
  preheaderText: '',
  language: 'it',
  brandName: BRAND_NAME,
  logoUrl: REMOTE_LOGO_URL,
  logoAlt: BRAND_NAME,
  bannerUrl: '',
  bannerAlt: BRAND_NAME,
  signatureName: 'Mattia Chinaglia',
  signatureRole: 'Founder & Lead Creative Developer • Tia Designs',
  signatureEmail: 'info@tiadesigns.it',
  emailLabel: 'Email',
  signatureWebsite: BRAND_URL,
  websiteLabel: 'Web',
  websiteText: 'tiadesigns.it',
  footerText: 'Proposta inviata da Mattia Chinaglia • Tia Designs • Mantova, Italia',
  footerNote: 'Se non desideri ricevere ulteriori proposte o hai domande, rispondi direttamente a questa email.',
};

export type EmailDesign = typeof EMAIL_DESIGN_DEFAULTS;

export interface BrandedEmailOptions extends Partial<EmailDesign> {
  recipientName?: string;
  /** Optional custom greeting override (e.g. "Spett.le Mantova Motor Giardino," or "Ciao Marco,") */
  greeting?: string;
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
  /**
   * One-click opt-out for campaigns. When present it REPLACES the generic
   * reply-to footer: a newsletter needs a real unsubscribe link, not an
   * invitation to answer an email.
   */
  unsubscribeUrl?: string;
  /** Localized "do you no longer want the newsletter?" line above the link. */
  unsubscribeNote?: string;
  /** Localized anchor text for the opt-out link. */
  unsubscribeLinkText?: string;
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
                  <img src="${url}" alt="${escapeEmailHtml(alt || BRAND_NAME)}" width="620" style="display:block; width:100%; max-width:620px; height:auto; border:0; outline:none;" />
                </td>
              </tr>`;
}

export function buildBrandedEmailHtml({
  recipientName,
  greeting,
  title,
  bodyMarkdown,
  ctaText,
  ctaUrl,
  badgeText = BRAND_NAME,
  preheaderText,
  bannerUrl,
  bannerAlt,
  logoUrl,
  unsubscribeUrl,
  unsubscribeNote,
  unsubscribeLinkText,
  language = EMAIL_DESIGN_DEFAULTS.language,
  brandName = BRAND_NAME,
  logoAlt = BRAND_NAME,
  signatureName = EMAIL_DESIGN_DEFAULTS.signatureName,
  signatureRole = EMAIL_DESIGN_DEFAULTS.signatureRole,
  signatureEmail = EMAIL_DESIGN_DEFAULTS.signatureEmail,
  emailLabel = EMAIL_DESIGN_DEFAULTS.emailLabel,
  signatureWebsite = EMAIL_DESIGN_DEFAULTS.signatureWebsite,
  websiteLabel = EMAIL_DESIGN_DEFAULTS.websiteLabel,
  websiteText = EMAIL_DESIGN_DEFAULTS.websiteText,
  footerText = EMAIL_DESIGN_DEFAULTS.footerText,
  footerNote = EMAIL_DESIGN_DEFAULTS.footerNote,
}: BrandedEmailOptions): string {
  const safeName = recipientName ? escapeEmailHtml(recipientName) : '';
  const safeGreeting = greeting ? escapeEmailHtml(greeting) : (safeName ? `Ciao ${safeName},` : '');
  const safeTitle = title ? escapeEmailHtml(title) : '';
  const safeCtaText = ctaText ? escapeEmailHtml(ctaText) : '';
  const safeLink = (url: string) => /^(https?:\/\/|mailto:|tel:)/i.test(url.trim()) ? escapeEmailHtml(url.trim()) : '';
  const safeImage = (url: string) => /^(https?:\/\/|\/(?!\/)|cid:)/i.test(url.trim()) ? escapeEmailHtml(url.trim()) : '';
  const safeCtaUrl = ctaUrl ? safeLink(ctaUrl) : '';
  const safeUnsubscribeUrl = unsubscribeUrl ? safeLink(unsubscribeUrl) : '';

  // Prevent duplicate greeting (e.g. "Ciao Marco," above the card AND "Ciao Marco," inside the card).
  // If safeGreeting or safeName is provided, strip any redundant greeting line from the start of bodyMarkdown.
  let cleanBodyMarkdown = bodyMarkdown;
  if (safeGreeting || safeName) {
    const leadingGreetingRegex = /^\s*(?:ciao|salve|buongiorno|buonasera|gentile|egregio|spett\.?le?|all['’]attenzione)\b[^\n]*?(?:[,!:]|\s)\s*(?:\r?\n)+/i;
    cleanBodyMarkdown = cleanBodyMarkdown.replace(leadingGreetingRegex, '');
  }

  const contentHtml = renderEmailMarkdown(cleanBodyMarkdown);

  // Use the same stable public asset in previews and delivered messages.
  // A serverless deployment may omit public/ from its function filesystem.
  const effectiveLogoSrc = safeImage(logoUrl === CID_LOGO_URL ? REMOTE_LOGO_URL : (logoUrl ?? REMOTE_LOGO_URL));

  return `
    <!DOCTYPE html>
    <html lang="${escapeEmailHtml(language)}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="dark light" />
      <title>${safeTitle || escapeEmailHtml(brandName)}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#040d0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#f3f4f6;">
      ${preheaderHtml(preheaderText)}
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#040d0a; padding:30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px; background-color:#081410; border:1px solid rgba(255,255,255,0.11); box-shadow:0 20px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(45,212,191,0.05); border-radius:24px; overflow:hidden;">
${bannerHtml(bannerUrl ? safeImage(bannerUrl) : undefined, bannerAlt)}
              <!-- Header: the logo, and nothing else -->
              <tr>
                <td style="padding:28px 32px 22px 32px; border-bottom:1px solid rgba(255,255,255,0.07); background-color:#081410;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td valign="middle">
                        ${effectiveLogoSrc ? `<img src="${effectiveLogoSrc}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="${escapeEmailHtml(logoAlt)}" style="display:block; width:${LOGO_WIDTH}px; height:${LOGO_HEIGHT}px; border:0; outline:none; text-decoration:none;" />` : ''}
                      </td>${badgeHtml(badgeText)}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 32px 26px 32px; background-color:#081410;">
                  ${safeTitle ? `<h1 style="color:#ffffff; font-size:23px; font-weight:700; margin:0 0 18px 0; line-height:1.3;">${safeTitle}</h1>` : ''}
                  ${safeGreeting ? `<p style="color:#5eead4; font-size:15px; font-weight:600; margin:0 0 18px 0;">${safeGreeting}</p>` : ''}

                  <div style="background-color:#040c09; border:1px solid rgba(255,255,255,0.08); box-shadow:inset 0 1px 0 rgba(255,255,255,0.05); border-radius:14px; padding:22px 26px;">
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
                <td style="padding:0 32px 28px 32px; background-color:#081410;">
                  <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
                    <p style="margin:0; color:#ffffff; font-size:14px; font-weight:700;">${escapeEmailHtml(signatureName)}</p>
                    <p style="margin:3px 0 0 0; color:#2dd4bf; font-size:12px;">${escapeEmailHtml(signatureRole)}</p>
                    <p style="margin:8px 0 0 0; color:#9ca3af; font-size:12px; line-height:1.7;">
                      ${signatureEmail ? `${escapeEmailHtml(emailLabel)}: <a href="${safeLink(`mailto:${signatureEmail}`)}" style="color:#2dd4bf; text-decoration:underline; font-weight:600;">${escapeEmailHtml(signatureEmail)}</a><br />` : ''}
                      ${signatureWebsite ? `${escapeEmailHtml(websiteLabel)}: <a href="${safeLink(signatureWebsite)}" style="color:#2dd4bf; text-decoration:underline; font-weight:600;">${escapeEmailHtml(websiteText)}</a>` : ''}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#040a08; padding:18px 32px; border-top:1px solid rgba(255,255,255,0.07); text-align:center;">
                  <p style="margin:0; color:#6b7280; font-size:11px; line-height:1.6;">
                    ${
                      safeUnsubscribeUrl
                        ? `${escapeEmailHtml(unsubscribeNote || 'Non vuoi pi\u00f9 ricevere la newsletter?')}<br />
                    <a href="${safeUnsubscribeUrl}" style="color:#2dd4bf; text-decoration:underline; font-weight:600;">${escapeEmailHtml(unsubscribeLinkText || 'Disiscriviti con un clic')}</a><br />
                    ${BRAND_NAME} • Mantova, Italia`
                        : `${escapeEmailHtml(footerText)}<br />${escapeEmailHtml(footerNote)}`
                    }
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
