import dns from 'dns';
import { createClient } from '@libsql/client';
import '../src/lib/env.ts';

// Override global dns.lookup
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};
  if (hostname === 'portfoliodb-tia004.aws-eu-west-1.turso.io') {
    console.log("DNS Hijacked for:", hostname, "with options:", opts);
    if (cb) {
      if (opts.all) {
        cb(null, [{ address: '34.255.61.174', family: 4 }]);
      } else {
        cb(null, '34.255.61.174', 4);
      }
      return;
    }
  }
  return originalLookup.apply(this, arguments);
};

async function main() {
  console.log("Testing overridden DNS @libsql/client connection...");
  const client = createClient({
    url: 'libsql://portfoliodb-tia004.aws-eu-west-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const res = await client.execute("SELECT 1");
    console.log("Success! DNS override worked perfectly. Execute result:", res);
  } catch (err) {
    console.error("Execute failed:", err);
  }
}

main();
