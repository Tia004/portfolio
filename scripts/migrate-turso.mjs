import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Error: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment variables.");
  process.exit(1);
}

const client = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Authenticator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialID" TEXT NOT NULL,
    "credentialPublicKey" BLOB NOT NULL,
    "counter" BIGINT NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "thumbnail" TEXT NOT NULL,
    "projectUrl" TEXT,
    "githubUrl" TEXT,
    "tags" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Authenticator_credentialID_key" ON "Authenticator"("credentialID")`
];

async function run() {
  console.log("Connecting to Turso Cloud Database...");
  console.log(`URL: ${url}`);
  
  for (const sql of statements) {
    try {
      console.log(`Executing statement...`);
      await client.execute(sql);
    } catch (err) {
      console.error("Error executing statement:", err);
      process.exit(1);
    }
  }
  
  console.log("🚀 Turso cloud database migration completed successfully!");
  client.close();
}

run();
