import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL || "libsql://portfoliodb-tia004.aws-eu-west-1.turso.io";
  const authToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkzMzU2MzgsImlkIjoiMDE5ZTQ4YWEtZjMwMS03YmExLTg5NmUtNGIwNzkwYjFhMGM0IiwicmlkIjoiZTY2MDc2MzktOTllNS00NzE5LTgwOTUtM2FiNDRiMTg3M2NlIn0.EHhH5KQQqjEWg-sqN230LSjcAT5gJyBLeFBAnvVKthMvy28I5GMeo7idq2se_agilOQj2FLJ2qg62PzIqMCLCg";
  
  console.log("Direct libSQL test with url:", url);
  try {
    const client = createClient({ url, authToken });
    const rs = await client.execute("SELECT 1;");
    console.log("Success! ResultSet:", rs);
    client.close();
  } catch (error) {
    console.error("Direct libSQL connection failed:", error);
  }
}

main();
