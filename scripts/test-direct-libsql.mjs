import { createClient } from '@libsql/client';
import { tursoCredentials } from './lib/turso-credentials.mjs';

async function main() {
  const { url, authToken } = tursoCredentials();

  console.log("Direct libSQL test with url:", url);
  try {
    const client = createClient({ url, authToken });
    const rs = await client.execute("SELECT 1;");
    console.log("Success! ResultSet:", rs);
    client.close();
  } catch (error) {
    console.error("Direct libSQL connection failed:", error);
    process.exitCode = 1;
  }
}

main();
