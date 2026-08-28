import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Parse .env
let tursoUrl = process.env.TURSO_DATABASE_URL;
let tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('TURSO_DATABASE_URL=')) {
          tursoUrl = trimmed.split('=')[1].replace(/["']/g, '');
        }
        if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) {
          tursoToken = trimmed.split('=')[1].replace(/["']/g, '');
        }
      }
    }
  } catch (e) {}
}

if (!tursoUrl) tursoUrl = "libsql://portfoliodb-tia004.aws-eu-west-1.turso.io";
if (!tursoToken) tursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkzMzU2MzgsImlkIjoiMDE5ZTQ4YWEtZjMwMS03YmExLTg5NmUtNGIwNzkwYjFhMGM0IiwicmlkIjoiZTY2MDc2MzktOTllNS00NzE5LTgwOTUtM2FiNDRiMTg3M2NlIn0.EHhH5KQQqjEWg-sqN230LSjcAT5gJyBLeFBAnvVKthMvy28I5GMeo7idq2se_agilOQj2FLJ2qg62PzIqMCLCg";

console.log('Connecting to Turso:', tursoUrl);
const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function run() {
  try {
    // 1. Add missing columns to Authenticator if needed
    console.log('Checking Authenticator columns...');
    try {
      await client.execute('ALTER TABLE Authenticator ADD COLUMN nickname TEXT;');
      console.log('Added nickname to Authenticator');
    } catch (e) {
      console.log('Column nickname already exists or error:', e.message);
    }

    try {
      await client.execute('ALTER TABLE Authenticator ADD COLUMN lastUsedAt DATETIME;');
      console.log('Added lastUsedAt to Authenticator');
    } catch (e) {
      console.log('Column lastUsedAt already exists or error:', e.message);
    }

    try {
      await client.execute('ALTER TABLE Authenticator ADD COLUMN createdAt DATETIME;');
      console.log('Added createdAt to Authenticator');
    } catch (e) {
      console.log('Column createdAt already exists or error:', e.message);
    }

    // 2. Create ContactMessage
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ContactMessage (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        service TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked ContactMessage table');

    // 3. Create ChatSessionLead
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ChatSessionLead (
        id TEXT PRIMARY KEY,
        sessionId TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        service TEXT,
        budget TEXT,
        userGoal TEXT,
        clientName TEXT,
        clientEmail TEXT,
        clientPhone TEXT,
        clientDetails TEXT,
        recapJson TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked ChatSessionLead table');

    // 4. Create FaqItem
    await client.execute(`
      CREATE TABLE IF NOT EXISTS FaqItem (
        id TEXT PRIMARY KEY,
        questionIt TEXT NOT NULL,
        questionEn TEXT,
        questionEs TEXT,
        answerIt TEXT NOT NULL,
        answerEn TEXT,
        answerEs TEXT,
        category TEXT NOT NULL DEFAULT 'general',
        "order" INTEGER NOT NULL DEFAULT 0,
        isPublished BOOLEAN NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked FaqItem table');

    // 5. Create ClientReview
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ClientReview (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        role TEXT NOT NULL,
        company TEXT,
        companyLogo TEXT,
        showLogo BOOLEAN NOT NULL DEFAULT 1,
        quoteIt TEXT NOT NULL,
        quoteEn TEXT,
        quoteEs TEXT,
        rating INTEGER NOT NULL DEFAULT 5,
        avatarUrl TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        isApproved BOOLEAN NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await client.execute('ALTER TABLE ClientReview ADD COLUMN companyLogo TEXT;');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE ClientReview ADD COLUMN showLogo BOOLEAN DEFAULT 1;');
    } catch (e) {}
    console.log('Checked ClientReview table');

    // 6. Create RecoveryCode
    await client.execute(`
      CREATE TABLE IF NOT EXISTS RecoveryCode (
        id TEXT PRIMARY KEY,
        codeHash TEXT UNIQUE NOT NULL,
        usedAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked RecoveryCode table');

    // 7. Create SystemLog
    await client.execute(`
      CREATE TABLE IF NOT EXISTS SystemLog (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL DEFAULT 'info',
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked SystemLog table');

    // 8. Create Quote
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Quote (
        id TEXT PRIMARY KEY,
        quoteNumber TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        validity TEXT NOT NULL,
        timeline TEXT NOT NULL,
        clientName TEXT NOT NULL,
        clientCompany TEXT,
        clientEmail TEXT NOT NULL,
        clientPhone TEXT,
        clientAddress TEXT,
        clientVat TEXT,
        itemsJson TEXT NOT NULL,
        discount INTEGER NOT NULL DEFAULT 0,
        taxRegime TEXT NOT NULL DEFAULT 'forfettario',
        paymentTerms TEXT NOT NULL,
        iban TEXT NOT NULL,
        notes TEXT,
        subtotal REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        signatureData TEXT,
        sentAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked Quote table');

    // 9. Project category check
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN category TEXT DEFAULT \'Sviluppo\';');
      console.log('Added category to Project');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN gallery TEXT;');
      console.log('Added gallery to Project');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN pdfUrl TEXT;');
      console.log('Added pdfUrl to Project');
    } catch (e) {}

    // 10. Create NewsletterCampaign
    await client.execute(`
      CREATE TABLE IF NOT EXISTS NewsletterCampaign (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        previewText TEXT,
        bodyContent TEXT NOT NULL,
        recipients TEXT NOT NULL DEFAULT 'all',
        recipientCount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        scheduledFor DATETIME,
        sentAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked NewsletterCampaign table');

    // 11. Create CustomEmailTemplate
    await client.execute(`
      CREATE TABLE IF NOT EXISTS CustomEmailTemplate (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '✉️',
        badge TEXT NOT NULL DEFAULT 'Tia Designs',
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        ctaText TEXT,
        ctaUrl TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked CustomEmailTemplate table');

    console.log('✅ Turso schema synchronization complete!');
  } catch (err) {
    console.error('❌ Error updating Turso database:', err);
  }
}

run();
