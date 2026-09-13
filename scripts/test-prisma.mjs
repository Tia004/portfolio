import { tursoCredentials } from './lib/turso-credentials.mjs';

console.log("Before Prisma Client Import:");
console.log("turso target =", tursoCredentials().url);

// prisma.ts resolves the credentials itself and throws a named error when they
// are missing, so this import is also a check of that path.
import { prisma } from '../src/lib/prisma.ts';

async function main() {
  console.log("Testing Prisma connection with Turso...");
  try {
    const users = await prisma.user.findMany();
    console.log("Success! Users fetched from Turso:", users);
  } catch (error) {
    console.error("Prisma query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

