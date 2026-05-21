import '../src/lib/env.ts';
console.log("Before Prisma Client Import:");
console.log("process.env.DATABASE_URL =", process.env.DATABASE_URL);
console.log("process.env.TURSO_DATABASE_URL =", process.env.TURSO_DATABASE_URL);

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

