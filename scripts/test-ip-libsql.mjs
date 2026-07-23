import '../src/lib/env.ts';
import { createClient } from '@libsql/client';

async function main() {
  console.log("Testing direct IP with @libsql/client...");
  const client = createClient({
    url: 'https://34.255.61.174',
    authToken: process.env.TURSO_AUTH_TOKEN,
    // Add Host header since we are connecting via IP
    headers: {
      'Host': 'portfoliodb-tia004.aws-eu-west-1.turso.io'
    }
  });

  try {
    const res = await client.execute("SELECT 1");
    console.log("Success! Execute result:", res);
  } catch (err) {
    console.error("Direct IP execute failed:", err);
  }
}

main();
