import dns from 'dns';
import { createClient } from '@libsql/client';
import { tursoCredentials, tursoHostname } from './lib/turso-credentials.mjs';

// Both the hostname and the credentials come from the environment: the host is
// derived from TURSO_DATABASE_URL, so this diagnostic never points at a
// database the app is not actually configured to use.
const { url, authToken } = tursoCredentials();
const hostname = tursoHostname();
// The IP to pin is a diagnostic input, not a credential: override it with
// TURSO_TEST_IP when you want to test a different address.
const testIp = process.env.TURSO_TEST_IP || '34.255.61.174';

// Override global dns.lookup
const originalLookup = dns.lookup;
dns.lookup = function (hostnameArg, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};
  if (hostnameArg === hostname) {
    console.log("DNS Hijacked for:", hostnameArg, "→", testIp, "with options:", opts);
    if (cb) {
      if (opts.all) {
        cb(null, [{ address: testIp, family: 4 }]);
      } else {
        cb(null, testIp, 4);
      }
      return;
    }
  }
  return originalLookup.apply(this, arguments);
};

async function main() {
  console.log("Testing overridden DNS @libsql/client connection...");
  const client = createClient({ url, authToken });

  try {
    const res = await client.execute("SELECT 1");
    console.log("Success! DNS override worked perfectly. Execute result:", res);
  } catch (err) {
    console.error("Execute failed:", err);
    process.exitCode = 1;
  }
}

main();
