import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import nodemailer from 'nodemailer';
// @ts-ignore
import MailComposer from 'nodemailer/lib/mail-composer';
import fs from 'fs';
import path from 'path';

export const ARUBA_IMAP_HOST = process.env.ARUBA_IMAP_HOST || 'imaps.aruba.it';
export const ARUBA_IMAP_PORT = parseInt(process.env.ARUBA_IMAP_PORT || '993', 10);
export const ARUBA_SMTP_HOST = process.env.ARUBA_SMTP_HOST || 'smtps.aruba.it';
export const ARUBA_SMTP_PORT = parseInt(process.env.ARUBA_SMTP_PORT || '465', 10);
export const ARUBA_EMAIL_USER = process.env.ARUBA_EMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || 'info@tiadesigns.it';
export const ARUBA_EMAIL_PASSWORD =
  process.env.ARUBA_EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || '';

export function isArubaConfigured(): boolean {
  return Boolean(
    ARUBA_EMAIL_USER &&
    ARUBA_EMAIL_PASSWORD &&
    ARUBA_EMAIL_USER.trim().length > 0 &&
    ARUBA_EMAIL_PASSWORD.trim().length > 0
  );
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  dataBase64?: string;
}

export interface ArubaEmailItem {
  uid: number;
  seq: number;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string;
  snippet: string;
  html?: string;
  text?: string;
  flags: string[];
  seen: boolean;
  flagged: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  mailbox: string;
}

export function getImapClient(): ImapFlow {
  return new ImapFlow({
    host: ARUBA_IMAP_HOST,
    port: ARUBA_IMAP_PORT,
    secure: true,
    auth: {
      user: ARUBA_EMAIL_USER,
      pass: ARUBA_EMAIL_PASSWORD,
    },
    logger: false,
    emitLogs: false,
  });
}

/**
 * Lists available mailboxes from Aruba IMAP
 */
export async function getArubaMailboxes(): Promise<string[]> {
  if (!isArubaConfigured()) return ['INBOX'];
  const client = getImapClient();
  try {
    await client.connect();
    const list = await client.list();
    await client.logout();
    return list.map((m) => m.path);
  } catch (err) {
    console.error('[Aruba IMAP] Failed to list mailboxes:', err);
    return ['INBOX', 'Sent', 'Trash', 'Junk'];
  }
}

/**
 * Fetches recent emails from Aruba IMAP folder (e.g. INBOX)
 */
export async function fetchArubaEmails(
  mailbox = 'INBOX',
  limit = 40
): Promise<{ emails: ArubaEmailItem[]; total: number; unread: number }> {
  if (!isArubaConfigured()) {
    return { emails: [], total: 0, unread: 0 };
  }

  const client = getImapClient();
  const emails: ArubaEmailItem[] = [];
  let total = 0;
  let unread = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      const status = await client.status(mailbox, { messages: true, unseen: true });
      total = status.messages || 0;
      unread = status.unseen || 0;

      if (total > 0) {
        // Fetch the last `limit` messages (reverse chronological)
        const startSeq = Math.max(1, total - limit + 1);
        const range = `${startSeq}:${total}`;

        for await (const msg of client.fetch(range, {
          envelope: true,
          flags: true,
          bodyStructure: true,
          source: true,
        })) {
          let parsed: ParsedMail | null = null;
          try {
            if (msg.source) {
              parsed = await simpleParser(msg.source);
            }
          } catch {}

          const flags = Array.from(msg.flags || []);
          const seen = flags.includes('\\Seen');
          const flagged = flags.includes('\\Flagged');

          const fromAddress = msg.envelope?.from?.[0]?.address || parsed?.from?.value?.[0]?.address || 'Sconosciuto';
          const fromName = msg.envelope?.from?.[0]?.name || parsed?.from?.value?.[0]?.name || fromAddress;

          const toList = (msg.envelope?.to || []).map((t) => ({
            name: t.name || t.address || '',
            address: t.address || '',
          }));

          const attachments: EmailAttachment[] = (parsed?.attachments || []).map((att) => ({
            filename: att.filename || 'allegato',
            contentType: att.contentType,
            size: att.size,
            contentId: att.contentId,
            dataBase64: att.content.toString('base64'),
          }));

          const snippet = (parsed?.text || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160);

          emails.push({
            uid: msg.uid,
            seq: msg.seq,
            subject: msg.envelope?.subject || parsed?.subject || '(Nessun oggetto)',
            from: { name: fromName, address: fromAddress },
            to: toList,
            date: (msg.envelope?.date || parsed?.date || new Date()).toISOString(),
            snippet: snippet || '(Nessun testo)',
            html: parsed?.html || undefined,
            text: parsed?.text || undefined,
            flags,
            seen,
            flagged,
            hasAttachments: attachments.length > 0,
            attachments,
            mailbox,
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: any) {
    console.error('[Aruba IMAP] Error fetching emails:', err);
    throw err;
  }

  // Sort descending by date
  emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { emails, total, unread };
}

/**
 * Fetches the full content of a specific email by UID
 */
export async function fetchArubaEmailDetail(
  uid: number,
  mailbox = 'INBOX'
): Promise<ArubaEmailItem | null> {
  if (!isArubaConfigured()) return null;

  const client = getImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    let emailItem: ArubaEmailItem | null = null;

    try {
      const msg = await client.fetchOne(`${uid}`, {
        envelope: true,
        flags: true,
        source: true,
        uid: true,
      }, { uid: true });

      if (msg && msg.source) {
        const parsed = await simpleParser(msg.source);
        const flags = Array.from(msg.flags || []);

        const fromAddress = msg.envelope?.from?.[0]?.address || parsed.from?.value?.[0]?.address || 'Sconosciuto';
        const fromName = msg.envelope?.from?.[0]?.name || parsed.from?.value?.[0]?.name || fromAddress;

        const toList = (msg.envelope?.to || []).map((t) => ({
          name: t.name || t.address || '',
          address: t.address || '',
        }));

        const attachments: EmailAttachment[] = (parsed.attachments || []).map((att) => ({
          filename: att.filename || 'allegato',
          contentType: att.contentType,
          size: att.size,
          contentId: att.contentId,
          dataBase64: att.content.toString('base64'),
        }));

        let resolvedHtml = parsed.html || parsed.textAsHtml || `<pre>${parsed.text || ''}</pre>`;

        // Convert inline CID attachments to base64 data URIs so web browsers (like the dashboard viewer) can render them immediately
        if (parsed.attachments && parsed.attachments.length > 0) {
          for (const att of parsed.attachments) {
            const mimeType = att.contentType || 'image/png';
            const base64Data = `data:${mimeType};base64,${att.content.toString('base64')}`;
            if (att.contentId) {
              const cleanCid = att.contentId.replace(/[<>]/g, '').trim();
              resolvedHtml = resolvedHtml.replace(new RegExp(`cid:(<${cleanCid}>|${cleanCid})`, 'gi'), base64Data);
            }
            if (att.filename) {
              resolvedHtml = resolvedHtml.replace(new RegExp(`cid:(<${att.filename}>|${att.filename})`, 'gi'), base64Data);
            }
          }
        }
        // Fallback for brand logo CID if missing from attachments
        resolvedHtml = resolvedHtml.replace(/cid:(<?TiaDesignsLogo-white\.png>?)/gi, 'https://tiadesigns.it/TiaDesignsLogo-white.png');

        emailItem = {
          uid: msg.uid,
          seq: msg.seq,
          subject: msg.envelope?.subject || parsed.subject || '(Nessun oggetto)',
          from: { name: fromName, address: fromAddress },
          to: toList,
          date: (msg.envelope?.date || parsed.date || new Date()).toISOString(),
          snippet: (parsed.text || '').slice(0, 160),
          html: resolvedHtml,
          text: parsed.text || '',
          flags,
          seen: flags.includes('\\Seen'),
          flagged: flags.includes('\\Flagged'),
          hasAttachments: attachments.length > 0,
          attachments,
          mailbox,
        };

        // Mark as seen automatically when opened
        if (!flags.includes('\\Seen')) {
          await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return emailItem;
  } catch (err) {
    console.error('[Aruba IMAP] Error fetching email detail:', err);
    return null;
  }
}

/**
 * Marks an email as seen/unseen or flagged in Aruba IMAP
 */
export async function updateArubaEmailFlags(
  uid: number,
  action: 'read' | 'unread' | 'flag' | 'unflag',
  mailbox = 'INBOX'
): Promise<boolean> {
  if (!isArubaConfigured()) return false;

  const client = getImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      if (action === 'read') {
        await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
      } else if (action === 'unread') {
        await client.messageFlagsRemove({ uid }, ['\\Seen'], { uid: true });
      } else if (action === 'flag') {
        await client.messageFlagsAdd({ uid }, ['\\Flagged'], { uid: true });
      } else if (action === 'unflag') {
        await client.messageFlagsRemove({ uid }, ['\\Flagged'], { uid: true });
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return true;
  } catch (err) {
    console.error('[Aruba IMAP] Error updating flags:', err);
    return false;
  }
}

/**
 * Moves an email to Trash or permanently deletes it
 */
export async function deleteArubaEmail(
  uid: number,
  mailbox = 'INBOX'
): Promise<boolean> {
  if (!isArubaConfigured()) return false;

  const client = getImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      if (mailbox.toLowerCase() === 'trash' || mailbox.toLowerCase().includes('cestino')) {
        await client.messageDelete({ uid }, { uid: true });
      } else {
        // Try moving to Trash or adding \\Deleted flag
        try {
          await client.messageMove({ uid }, 'Trash', { uid: true });
        } catch {
          await client.messageDelete({ uid }, { uid: true });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return true;
  } catch (err) {
    console.error('[Aruba IMAP] Error deleting email:', err);
    return false;
  }
}

/**
 * Sends an email using Aruba SMTP with full HTML, attachments, GIFs, etc.
 */
export async function sendArubaEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: {
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
    cid?: string;
  }[];
}): Promise<{ success: boolean; messageId?: string }> {
  if (!isArubaConfigured()) {
    throw new Error('Credenziali Aruba Mail non configurate in .env o su Vercel');
  }

  const transporter = nodemailer.createTransport({
    host: ARUBA_SMTP_HOST,
    port: ARUBA_SMTP_PORT,
    secure: true,
    auth: {
      user: ARUBA_EMAIL_USER,
      pass: ARUBA_EMAIL_PASSWORD,
    },
  });

  const attachments = options.attachments ? [...options.attachments] : [];
  const logoPath = path.join(process.cwd(), 'public', 'TiaDesignsLogo-white.png');

  // Auto-embed logo as inline CID attachment if referenced in HTML so email clients don't block it
  if (
    options.html.includes('cid:TiaDesignsLogo-white.png') &&
    !attachments.some((a) => a.cid === 'TiaDesignsLogo-white.png')
  ) {
    try {
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'TiaDesignsLogo-white.png',
          path: logoPath,
          cid: 'TiaDesignsLogo-white.png',
          contentType: 'image/png',
        });
      }
    } catch (e) {
      console.warn('Could not attach inline logo for Aruba SMTP:', e);
    }
  }

  const mailOptions = {
    from: `Tia Designs <${ARUBA_EMAIL_USER}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo || ARUBA_EMAIL_USER,
    subject: options.subject,
    text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
    html: options.html,
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  const info = await transporter.sendMail(mailOptions);

  // Automatically save copy to Posta Inviata (Sent) via IMAP APPEND in background
  appendArubaSentEmail(mailOptions).catch((err) =>
    console.warn('[Aruba Mail] appendArubaSentEmail background error:', err)
  );

  return { success: true, messageId: info.messageId };
}

/**
 * Appends a copy of a sent email into the Aruba IMAP "Sent" / "Posta Inviata" folder.
 */
export async function appendArubaSentEmail(mailOptions: any): Promise<boolean> {
  if (!isArubaConfigured()) return false;
  try {
    const rawBuffer = await new Promise<Buffer>((resolve, reject) => {
      const composer = new MailComposer(mailOptions).compile();
      composer.build((err: any, buffer: Buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    const client = getImapClient();
    await client.connect();

    let sentMailbox = 'Sent';
    try {
      const boxes = await client.list();
      const detected = boxes.find(
        (b) =>
          b.specialUse === '\\Sent' ||
          /^(sent|inbox\.sent|posta inviata|inbox\.posta inviata)$/i.test(b.path) ||
          /sent|inviata/i.test(b.name)
      );
      if (detected) {
        sentMailbox = detected.path;
      }
    } catch {
      // Keep 'Sent' fallback
    }

    await client.append(sentMailbox, rawBuffer, ['\\Seen']);
    await client.logout();
    return true;
  } catch (err) {
    console.warn('[Aruba Mail] Could not append sent email to Sent folder:', err);
    return false;
  }
}
