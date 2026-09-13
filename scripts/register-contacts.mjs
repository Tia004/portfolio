import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { tursoCredentials } from './lib/turso-credentials.mjs';

const csvPath1 = '/Users/tia/.gemini/antigravity-ide/brain/9bc00752-0cae-4480-ba09-3d8720f7730b/scratch/input_already_contacted.csv';
const csvPath2 = '/Users/tia/.gemini/antigravity-ide/brain/9bc00752-0cae-4480-ba09-3d8720f7730b/scratch/input_block2.csv';
const raw = fs.readFileSync(csvPath1, 'utf8') + '\n' + (fs.existsSync(csvPath2) ? fs.readFileSync(csvPath2, 'utf8') : '');

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      currentRow.push(currentToken);
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentToken);
      currentToken = '';
      if (currentRow.some(cell => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || currentRow.length > 0) {
    currentRow.push(currentToken);
    if (currentRow.some(cell => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const parsedRows = parseCsv(raw);
console.log(`Parsed ${parsedRows.length} total rows from CSV.`);

const EXEMPT_EMAILS = new Set([
  'info@tiadesigns.it',
  'tiachinaglia@gmail.com',
  'latitiante@gmail.com',
]);

const recordsToInsert = [];
const seenEmails = new Set();

for (const row of parsedRows) {
  if (!row || row.length < 3) continue;
  const email = (row[0] || '').trim().replace(/^"|"$/g, '').toLowerCase();
  const name = (row[1] || '').trim().replace(/^"|"$/g, '');
  const company = (row[2] || '').trim().replace(/^"|"$/g, '');
  const subject = (row[3] || '').trim().replace(/^"|"$/g, '');

  if (!email || email === 'email') continue;
  if (!email.includes('@')) continue;
  if (EXEMPT_EMAILS.has(email)) {
    console.log(`Skipping exempt email: ${email}`);
    continue;
  }

  if (seenEmails.has(email)) continue;
  seenEmails.add(email);

  recordsToInsert.push({
    email,
    name: name || null,
    company: company || null,
    subject: subject || null,
  });
}

console.log(`Unique valid emails to register: ${recordsToInsert.length}`);

const { url: tursoUrl, authToken: tursoToken } = tursoCredentials();

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function main() {
  let insertedCount = 0;
  let alreadyPresentCount = 0;

  for (const item of recordsToInsert) {
    const existing = await client.execute({
      sql: 'SELECT id FROM SentEmailLog WHERE LOWER(email) = ? LIMIT 1',
      args: [item.email],
    });

    if (existing.rows.length > 0) {
      alreadyPresentCount++;
    } else {
      const id = 'sent_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO SentEmailLog (id, email, name, company, subject, source, sentAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.email,
          item.name,
          item.company,
          item.subject,
          'csv_import_campaign',
          now,
        ],
      });
      insertedCount++;
    }
  }

  console.log(`\n--- RISULTATO REGISTRAZIONE ---`);
  console.log(`Nuovi indirizzi inseriti nello storico: ${insertedCount}`);
  console.log(`Indirizzi già presenti: ${alreadyPresentCount}`);

  const total = await client.execute('SELECT COUNT(*) as count FROM SentEmailLog');
  console.log(`Totale email nello storico 'SentEmailLog': ${total.rows[0].count}`);
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
