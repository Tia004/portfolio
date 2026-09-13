import { createClient } from '@libsql/client';
import { tursoCredentials } from './lib/turso-credentials.mjs';

// Credentials come from the environment (or .env) only — this script runs in
// `npm run build`, so a missing value must stop the build with a message that
// names the variable instead of silently using a committed token.
const { url: tursoUrl, authToken: tursoToken } = tursoCredentials();

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

    // 9. Project category & multilingual check
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
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN titleEn TEXT;');
      console.log('Added titleEn to Project');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN titleEs TEXT;');
      console.log('Added titleEs to Project');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN descriptionEn TEXT;');
      console.log('Added descriptionEn to Project');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE Project ADD COLUMN descriptionEs TEXT;');
      console.log('Added descriptionEs to Project');
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

    // 12. Create NewsletterSubscriber (public double opt-in signup)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS NewsletterSubscriber (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        locale TEXT NOT NULL DEFAULT 'it',
        source TEXT NOT NULL DEFAULT 'website',
        consentText TEXT,
        consentAt DATETIME,
        confirmToken TEXT,
        unsubscribeToken TEXT NOT NULL,
        confirmedAt DATETIME,
        unsubscribedAt DATETIME,
        ipHash TEXT,
        userAgent TEXT,
        lastEmailAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Unique indexes: email is the identity, the tokens are capabilities.
    // CREATE INDEX IF NOT EXISTS keeps this idempotent on every deploy.
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS NewsletterSubscriber_email_key ON NewsletterSubscriber(email);');
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS NewsletterSubscriber_confirmToken_key ON NewsletterSubscriber(confirmToken);');
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS NewsletterSubscriber_unsubscribeToken_key ON NewsletterSubscriber(unsubscribeToken);');
    await client.execute('CREATE INDEX IF NOT EXISTS NewsletterSubscriber_status_createdAt_idx ON NewsletterSubscriber(status, createdAt);');
    console.log('Checked NewsletterSubscriber table');

    // 13. Create SentEmailLog (Registry of sent emails to prevent duplication and spam)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS SentEmailLog (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        company TEXT,
        subject TEXT,
        source TEXT NOT NULL DEFAULT 'auto_sender',
        sentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.execute('CREATE INDEX IF NOT EXISTS SentEmailLog_email_idx ON SentEmailLog(email);');
    await client.execute('CREATE INDEX IF NOT EXISTS SentEmailLog_sentAt_idx ON SentEmailLog(sentAt);');
    console.log('Checked SentEmailLog table');

    // 14. Create ClientReferral (Personal client referral links with automatic 20% attribution)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ClientReferral (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        clientName TEXT NOT NULL,
        clientEmail TEXT NOT NULL,
        clientCompany TEXT,
        discountPercent INTEGER NOT NULL DEFAULT 20,
        visitsCount INTEGER NOT NULL DEFAULT 0,
        leadsCount INTEGER NOT NULL DEFAULT 0,
        conversionsCount INTEGER NOT NULL DEFAULT 0,
        totalRewardAttributed REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS ClientReferral_code_key ON ClientReferral(code);');
    await client.execute('CREATE INDEX IF NOT EXISTS ClientReferral_code_idx ON ClientReferral(code);');
    await client.execute('CREATE INDEX IF NOT EXISTS ClientReferral_clientEmail_idx ON ClientReferral(clientEmail);');
    await client.execute('CREATE INDEX IF NOT EXISTS ClientReferral_status_idx ON ClientReferral(status);');
    console.log('Checked ClientReferral table');

    // 15. Create ReferralLeadLog (Attribution logs for every lead brought by a referral)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ReferralLeadLog (
        id TEXT PRIMARY KEY,
        referralId TEXT NOT NULL,
        referralCode TEXT NOT NULL,
        leadName TEXT NOT NULL,
        leadEmail TEXT NOT NULL,
        service TEXT,
        source TEXT NOT NULL DEFAULT 'contact',
        dealValue REAL,
        attributedReward REAL,
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referralId) REFERENCES ClientReferral(id) ON DELETE CASCADE
      );
    `);
    await client.execute('CREATE INDEX IF NOT EXISTS ReferralLeadLog_referralId_idx ON ReferralLeadLog(referralId);');
    await client.execute('CREATE INDEX IF NOT EXISTS ReferralLeadLog_referralCode_idx ON ReferralLeadLog(referralCode);');
    await client.execute('CREATE INDEX IF NOT EXISTS ReferralLeadLog_createdAt_idx ON ReferralLeadLog(createdAt);');
    console.log('Checked ReferralLeadLog table');

    console.log('✅ Turso schema synchronization complete!');
  } catch (err) {
    console.error('❌ Error updating Turso database:', err);
  }
}

run();
