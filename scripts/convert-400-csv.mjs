import fs from 'fs';
import path from 'path';

function parseCsv(text, delimiter = ';') {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0));
}

function escapeCsvField(val) {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

const inputPath = '/Users/tia/Downloads/TiaDesigns_dashboard_400_aziende.csv';
const rawContent = fs.readFileSync(inputPath, 'utf8');

const parsed = parseCsv(rawContent, ';');
console.log('Total parsed rows in 400 csv:', parsed.length);

const header = parsed[0];
console.log('Original Header:', header);
const data = parsed.slice(1);

const convertedRows = [];
// Clean standard Header
convertedRows.push(['email', 'nome', 'azienda', 'oggetto', 'corpo'].map(escapeCsvField).join(';'));

let countTransformed = 0;
const validCompanies = [];

data.forEach(([rawEmail, rawNome, rawAzienda, rawOggetto, rawCorpo], idx) => {
  const email = (rawEmail || '').trim();
  const nome = (rawNome || '').trim();
  const azienda = (rawAzienda || '').trim();
  let cleanCorpo = (rawCorpo || '').trim();

  if (!email || !email.includes('@')) return;

  let finalSubject = (rawOggetto || '').trim();
  if (finalSubject.includes('|')) {
    const parts = finalSubject.split('|').map((p) => p.trim());
    const topic = parts[0];
    finalSubject = `${azienda} - ${topic}`;
    countTransformed++;
  } else if (!finalSubject.startsWith(azienda) && azienda) {
    finalSubject = `${azienda} - ${finalSubject}`;
    countTransformed++;
  }

  validCompanies.push({
    email,
    nome,
    azienda,
    oggetto: finalSubject,
    corpo: cleanCorpo,
  });

  const rowCsv = [
    escapeCsvField(email),
    escapeCsvField(nome),
    escapeCsvField(azienda),
    escapeCsvField(finalSubject),
    escapeCsvField(cleanCorpo),
  ].join(';');

  convertedRows.push(rowCsv);
});

const outputContent = convertedRows.join('\r\n') + '\r\n';

const targetNew = '/Users/tia/Downloads/campagna_400_aziende_tiadesigns.csv';
fs.writeFileSync(targetNew, outputContent, 'utf8');
console.log(`Saved new formatted CSV to: ${targetNew}`);

// Also save to public/campaigns/ for direct dashboard loading
const publicCampaignDir = '/Users/tia/Downloads/Siti/portfolio/public/campaigns';
if (!fs.existsSync(publicCampaignDir)) {
  fs.mkdirSync(publicCampaignDir, { recursive: true });
}
fs.writeFileSync(path.join(publicCampaignDir, 'campagna_400_aziende.csv'), outputContent, 'utf8');
console.log(`Saved copy to public/campaigns/campagna_400_aziende.csv for direct dashboard 1-click loading.`);

// Also update the original file in Downloads so selecting either one works
fs.writeFileSync(inputPath, outputContent, 'utf8');
console.log(`Also updated original file: ${inputPath}`);

console.log(`Successfully converted ${validCompanies.length} valid companies! (${countTransformed} subjects reformatted to '[Azienda] - [Oggetto]')`);
