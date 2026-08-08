// Align the production Turso DB with the standard Prisma migration flow.
// - Creates the `_prisma_migrations` history table (exact Prisma schema)
// - Records the 3 migrations as applied (checksums computed by `prisma migrate resolve`)
// - Aligns AvailabilitySetting DDL with the current schema (AUTOINCREMENT, no default)
// Idempotent: safe to re-run.
// Usage: node scripts/align-turso-migrations.mjs
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Checksums exactly as produced by `prisma migrate resolve --applied`
// against a scratch database (sha256 of each migration file).
const MIGRATIONS = [
  {
    name: '20260521030810_init',
    checksum: '053ebac31a3a911a080cfd84168bd548e60aee54ce507f7efe92f0c6f1fce62c',
  },
  {
    name: '20260801090000_add_availability',
    checksum: '2517fd65679bb3739c15f1a3de22a08a3c4861bfa114192a3b8f7b3f233525c6',
  },
  {
    name: '20260809000000_add_chat_analytics_events',
    checksum: 'a8d0ee6d77b612213ec7a96267eae4f4a554e435332792d4717fa3695961c451',
  },
];

async function main() {
  console.log('🔎 Aligning production Turso with Prisma migration history…\n');

  // 1. Ensure the history table exists (exact Prisma schema)
  await db.execute(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
  )`);
  console.log('✅ _prisma_migrations table ready');

  // 2. Record each migration as applied (skip if already recorded)
  for (const m of MIGRATIONS) {
    const existing = await db.execute({
      sql: `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ?`,
      args: [m.name],
    });
    if (existing.rows.length > 0) {
      console.log(`⏭️  ${m.name} already recorded`);
      continue;
    }
    await db.execute({
      sql: `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), m.checksum, new Date().toISOString(), m.name, new Date().toISOString(), 0],
    });
    console.log(`✅ ${m.name} marked as applied`);
  }

  // 3. Align AvailabilitySetting DDL with the schema (redefine, preserves data)
  const av = await db.execute(`SELECT sql FROM sqlite_master WHERE name = 'AvailabilitySetting'`);
  const avSql = String(av.rows[0]?.sql ?? '');
  if (!avSql.includes('AUTOINCREMENT')) {
    console.log('🔄 Redefining AvailabilitySetting to match schema…');
    await db.execute(`PRAGMA defer_foreign_keys=ON`);
    await db.execute(`PRAGMA foreign_keys=OFF`);
    await db.execute(`CREATE TABLE "new_AvailabilitySetting" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "isOnline" BOOLEAN NOT NULL DEFAULT true,
      "updatedAt" DATETIME NOT NULL
    )`);
    await db.execute(`INSERT INTO "new_AvailabilitySetting" ("id", "isOnline", "updatedAt")
      SELECT "id", "isOnline", "updatedAt" FROM "AvailabilitySetting"`);
    await db.execute(`DROP TABLE "AvailabilitySetting"`);
    await db.execute(`ALTER TABLE "new_AvailabilitySetting" RENAME TO "AvailabilitySetting"`);
    await db.execute(`PRAGMA foreign_keys=ON`);
    await db.execute(`PRAGMA defer_foreign_keys=OFF`);
    console.log('✅ AvailabilitySetting redefined (data preserved)');
  } else {
    console.log('⏭️  AvailabilitySetting already aligned');
  }

  // 4. Final verification
  const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`);
  console.log('\n📋 Tables on Turso:', tables.rows.map(r => r.name).join(', '));
  const applied = await db.execute(`SELECT migration_name, rolled_back_at IS NULL AS ok FROM "_prisma_migrations" ORDER BY migration_name`);
  console.log('📜 Migration history:');
  for (const r of applied.rows) console.log(`   ${r.migration_name} → ${r.ok ? 'applied ✅' : 'rolled back ❌'}`);
  const av2 = await db.execute(`SELECT sql FROM sqlite_master WHERE name = 'AvailabilitySetting'`);
  console.log('\n📐 AvailabilitySetting DDL:');
  console.log(String(av2.rows[0]?.sql ?? '(missing)'));
  console.log('\n🚀 Done.');
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
