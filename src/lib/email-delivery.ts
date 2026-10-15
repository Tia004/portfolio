/** Pure outbound preparation, shared by SMTP, Resend and MIME regressions. */
export const BRAND_LOGO_URL = 'https://tiadesigns.it/TiaDesignsLogo-white.png';

export function prepareEmailHtml(html: string): string {
  return html.replace(/cid:(?:<TiaDesignsLogo-white\.png>|TiaDesignsLogo-white\.png)/gi, BRAND_LOGO_URL);
}

export function emailPlainText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:br\b[^>]*|\/(?:p|div|tr|h[1-6]|li|table))>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|apos|rarr);/g, (_, name: string) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rarr: '→' }[name] || ''))
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value: string) => {
      const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
      return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

/** SMTP acceptance is a receipt, not proof of inbox placement. */
export function smtpReceipt(info: { accepted?: unknown[]; rejected?: unknown[]; messageId?: string }, expected: string[]) {
  const address = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
  const accepted = (info.accepted || []).map(address).filter(Boolean);
  const rejected = (info.rejected || []).map(address).filter(Boolean);
  return { success: expected.length > 0 && expected.every(v => accepted.includes(address(v))) && rejected.length === 0, messageId: info.messageId, accepted, rejected };
}
