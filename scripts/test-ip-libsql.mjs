import { createClient } from '@libsql/client';
import { tursoCredentials, tursoHostname } from './lib/turso-credentials.mjs';

// Diagnostic: connect to the database by IP instead of by name. The host comes
// from the configured URL (never hardcoded) so this can only ever test the
// database the app actually uses.
const { authToken } = tursoCredentials();
const hostname = tursoHostname();
const testIp = process.env.TURSO_TEST_IP || '34.255.61.174';

async function main() {
  console.log(`Testing direct IP ${testIp} (Host: ${hostname}) with @libsql/client...`);
  const client = createClient({
    url: `https://${testIp}`,
    authToken,
    // Add Host header since we are connecting via IP
    headers: { 'Host': hostname },
  });

  try {
    const res = await client.execute("SELECT 1");
    console.log("Success! Execute result:", res);
  } catch (err) {
    console.error("Direct IP execute failed:", err);
    process.exitCode = 1;
  }
}

main();
