import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { tursoCredentials } from './lib/turso-credentials.mjs';
dotenv.config();

const client = createClient(tursoCredentials());

async function main() {
  const res = await client.execute('SELECT id, title, thumbnail, category, featured, "order", createdAt FROM Project ORDER BY "order" ASC, createdAt DESC');
  console.log('Projects in Turso DB:');
  for (const row of res.rows) {
    console.log(`- [${row.order}] ${row.title} (Cat: ${row.category}, Featured: ${row.featured}) -> Thumbnail: "${row.thumbnail}"`);
  }
}

main().catch(console.error);
