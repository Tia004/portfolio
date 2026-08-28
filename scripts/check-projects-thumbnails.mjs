import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const res = await client.execute('SELECT id, title, thumbnail, category, featured, "order", createdAt FROM Project ORDER BY "order" ASC, createdAt DESC');
  console.log('Projects in Turso DB:');
  for (const row of res.rows) {
    console.log(`- [${row.order}] ${row.title} (Cat: ${row.category}, Featured: ${row.featured}) -> Thumbnail: "${row.thumbnail}"`);
  }
}

main().catch(console.error);
